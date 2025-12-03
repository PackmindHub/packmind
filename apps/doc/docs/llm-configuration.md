# LLM Provider Configuration

Configure your LLM (Large Language Model) provider to enable AI-powered features in Packmind, such as customizing standards and recipes for AI Agents.

## Supported Providers

Packmind supports the following LLM providers:

| Provider              | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **OpenAI**            | OpenAI GPT models including GPT-4 and GPT-5              |
| **Anthropic Claude**  | Anthropic Claude models known for safety and helpfulness |
| **Google Gemini**     | Google's Gemini models with multimodal capabilities      |
| **Azure OpenAI**      | Microsoft Azure-hosted OpenAI models                     |
| **OpenAI-Compatible** | Any OpenAI-compatible API (Ollama, LM Studio, etc.)      |

## Configuration via Web Interface

The recommended way to configure your LLM provider is through the Packmind web interface:

1. Log in to Packmind as an administrator
2. Navigate to **Settings** > **AI** > **Provider**
3. Select your preferred provider from the dropdown
4. Fill in the required configuration fields
5. Save the configuration

## Model Selection Guidelines

Packmind uses two model types:

- **Primary Model**: Used for complex operations like generating detailed standards and recipes. Choose a more capable model here.
- **Fast Model**: Used for simpler operations where speed matters more than capability. Choose an economical model here.

**Recommended configurations:**

| Provider      | Primary Model                | Fast Model                  |
| ------------- | ---------------------------- | --------------------------- |
| OpenAI        | `gpt-5.1`                    | `gpt-4.1-mini`              |
| Anthropic     | `claude-sonnet-4-5-20250929` | `claude-haiku-4-5-20251001` |
| Google Gemini | `gemini-3-pro-preview`       | `gemini-2.5-flash`          |

## Security Considerations

- API keys are encrypted at rest in the database
- Keys are never exposed in API responses after being saved
- Use environment-specific API keys for different deployments
- Rotate your API keys periodically
- Monitor your API usage to detect any unauthorized access

## Troubleshooting

### Connection Test Fails

1. Verify your API key is correct and has not expired
2. Check that your network allows outbound connections to the provider's API
3. For Azure OpenAI, ensure the deployment name matches exactly
4. For local providers (Ollama, LM Studio), verify the server is running

### Model Not Found

1. Verify the model name is spelled correctly
2. For Azure OpenAI, use the deployment name, not the model name
3. For Ollama, ensure the model is pulled: `ollama pull <model-name>`
4. Check that your API key has access to the specified model

### Rate Limiting

If you encounter rate limiting errors:

1. Consider using a lower-tier model for the Fast Model
2. Upgrade your API plan with the provider
3. Implement request queuing in high-traffic scenarios
