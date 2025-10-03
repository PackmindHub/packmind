# Use Packmind Cloud

## Overview

Packmind Cloud is a fully managed service that allows you to use Packmind without managing any infrastructure. Simply sign up and start using the platform immediately.

## Availability

Packmind Cloud is currently available at [https://app.packmind.ai](https://app.packmind.ai) (EU region).

**US region will come soon.**

## AI and LLM Configuration

By default, OpenAI is enabled as the LLM provider for all organizations. You'll soon be able to configure your own LLM provider.

### Data Privacy

- **Training**: Your data is not used by OpenAI for training any models
- **Storage**: LLM prompts are not stored in the database
- **Metadata**: Only metadata such as the number of input and output tokens is stored

## Security and Data Processing

### Data Protection

- **Encryption at rest**: All data is encrypted using AES 256
- **Encryption in transit**: All data transfers use SSL encryption
- **Database backups**: Encrypted using AES 256

### Compliance

Packmind is certified **SOC 2 Type II**. Feel free to contact us to request a copy of the report at contact_at_packmind.com.

## Sub-processors

| Name            | Website                                            | Purpose       | Data Processed            | Region of Data Hosting |
| --------------- | -------------------------------------------------- | ------------- | ------------------------- | ---------------------- |
| Microsoft Azure | [azure.microsoft.com](https://azure.microsoft.com) | Cloud hosting | All application data      | France Central (EU)    |
| OpenAI          | [openai.com](https://openai.com)                   | LLM provider  | LLM prompts and responses | United States          |
| Brevo           | [brevo.com](https://www.brevo.com)                 | SMTP relay    | Email addresses           | Belgium (EU)           |

### Personal Data

Packmind only stores email addresses as personal information. Reach us at dpo_at_packmind.com if you have any request regarding your current personal data we own, or any deletion request.
