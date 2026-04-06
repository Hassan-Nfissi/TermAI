package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
	cfg Config
}

type Config struct {
	Provider string `json:"provider"`
	APIKey   string `json:"api_key"`
	Model    string `json:"model"`
	Theme    string `json:"theme,omitempty"`
}

type Suggestion struct {
	Command     string `json:"command"`
	Description string `json:"description"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	cfg, err := a.readConfig()
	if err == nil {
		a.cfg = cfg
	}
}

func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "termai", "config.json"), nil
}

func (a *App) readConfig() (Config, error) {
	path, err := configPath()
	if err != nil {
		return Config{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, err
	}
	if cfg.APIKey == "" {
		return Config{}, fmt.Errorf("empty api key")
	}
	return cfg, nil
}

func (a *App) writeConfig(cfg Config) bool {
	path, err := configPath()
	if err != nil {
		return false
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return false
	}
	data, err := json.Marshal(cfg)
	if err != nil {
		return false
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		return false
	}
	a.cfg = cfg
	return true
}

func (a *App) IsConfigured() bool {
	_, err := a.readConfig()
	return err == nil
}

func (a *App) LoadConfig() Config {
	cfg, err := a.readConfig()
	if err != nil {
		return Config{}
	}
	return cfg
}

// SaveConfig — used by the first-launch Setup screen
func (a *App) SaveConfig(provider, apiKey, model string) bool {
	theme := "dark"
	if a.cfg.Theme != "" {
		theme = a.cfg.Theme
	}
	return a.writeConfig(Config{
		Provider: provider,
		APIKey:   apiKey,
		Model:    model,
		Theme:    theme,
	})
}

// SaveSettings — used by the Settings screen (includes theme)
func (a *App) SaveSettings(provider, apiKey, model, theme string) bool {
	return a.writeConfig(Config{
		Provider: provider,
		APIKey:   apiKey,
		Model:    model,
		Theme:    theme,
	})
}

// SaveTheme — quick toggle from titlebar, preserves all other fields
func (a *App) SaveTheme(theme string) bool {
	cfg, err := a.readConfig()
	if err != nil {
		return false
	}
	cfg.Theme = theme
	return a.writeConfig(cfg)
}

const systemPrompt = `You are a command assistant. The user describes what they want to do and you suggest commands.

RULES:
- Respond with EXACTLY 3 command suggestions
- Return ONLY a JSON array, nothing else
- No markdown, no backticks, no explanation outside the JSON
- Each suggestion has "command" and "description" fields
- Description must be under 15 words
- Commands must be real and valid

Format:
[
  {"command": "the command here", "description": "short description"},
  {"command": "another command", "description": "short description"},
  {"command": "third option", "description": "short description"}
]`

type openAIRequest struct {
	Model       string    `json:"model"`
	Messages    []message `json:"messages"`
	Temperature float64   `json:"temperature"`
	MaxTokens   int       `json:"max_tokens"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type anthropicRequest struct {
	Model     string    `json:"model"`
	Messages  []message `json:"messages"`
	System    string    `json:"system"`
	MaxTokens int       `json:"max_tokens"`
}

type anthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (a *App) Ask(query string) ([]Suggestion, error) {
	cfg, err := a.readConfig()
	if err != nil {
		return nil, fmt.Errorf("not configured — restart the app")
	}
	a.cfg = cfg

	switch cfg.Provider {
	case "groq", "openai":
		return a.askOpenAICompat(query, cfg)
	case "anthropic":
		return a.askAnthropic(query, cfg)
	default:
		return nil, fmt.Errorf("unknown provider: %s", cfg.Provider)
	}
}

func (a *App) askOpenAICompat(query string, cfg Config) ([]Suggestion, error) {
	endpoint := "https://api.openai.com/v1/chat/completions"
	if cfg.Provider == "groq" {
		endpoint = "https://api.groq.com/openai/v1/chat/completions"
	}

	reqBody := openAIRequest{
		Model: cfg.Model,
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: query},
		},
		Temperature: 0.3,
		MaxTokens:   300,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", endpoint, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connection failed. Check your internet")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp openAIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unexpected response from API")
	}

	if resp.StatusCode != 200 {
		if apiResp.Error != nil {
			return nil, fmt.Errorf("API error: %s", apiResp.Error.Message)
		}
		return nil, fmt.Errorf("API returned status %d — check your API key", resp.StatusCode)
	}

	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("empty response from API")
	}

	content := strings.TrimSpace(apiResp.Choices[0].Message.Content)
	return parseSuggestions(content)
}

func (a *App) askAnthropic(query string, cfg Config) ([]Suggestion, error) {
	reqBody := anthropicRequest{
		Model: cfg.Model,
		Messages: []message{
			{Role: "user", Content: query},
		},
		System:    systemPrompt,
		MaxTokens: 300,
	}

	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", cfg.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connection failed. Check your internet")
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp anthropicResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("unexpected response from API")
	}

	if resp.StatusCode != 200 {
		if apiResp.Error != nil {
			return nil, fmt.Errorf("API error: %s", apiResp.Error.Message)
		}
		return nil, fmt.Errorf("API returned status %d — check your API key", resp.StatusCode)
	}

	if len(apiResp.Content) == 0 {
		return nil, fmt.Errorf("empty response from API")
	}

	content := strings.TrimSpace(apiResp.Content[0].Text)
	return parseSuggestions(content)
}

func parseSuggestions(content string) ([]Suggestion, error) {
	start := strings.Index(content, "[")
	end := strings.LastIndex(content, "]")
	if start == -1 || end == -1 || end <= start {
		return nil, fmt.Errorf("couldn't parse the response. Try again")
	}
	jsonStr := content[start : end+1]

	var suggestions []Suggestion
	if err := json.Unmarshal([]byte(jsonStr), &suggestions); err != nil {
		return nil, fmt.Errorf("couldn't parse the response. Try again")
	}
	if len(suggestions) == 0 {
		return nil, fmt.Errorf("no suggestions returned")
	}
	return suggestions, nil
}

func (a *App) CopyToClipboard(text string) bool {
	return runtime.ClipboardSetText(a.ctx, text) == nil
}

func (a *App) SetAlwaysOnTop(onTop bool) {
	runtime.WindowSetAlwaysOnTop(a.ctx, onTop)
}
