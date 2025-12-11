# Procédure : Mise en place d'un Logger MCP pour Actions Automatisées

## 1. Contexte et Objectif
Cette procédure décrit comment implémenter un serveur **MCP (Model Context Protocol)** en **TypeScript**.

L'objectif est d'intercepter les dialogues entre un utilisateur et un agent IA (Claude, Cursor, etc.) pour :
1.  **Archiver** l'historique complet des échanges dans un fichier local.
2.  **Détecter** des mots-clés ou intentions spécifiques.
3.  **Déclencher** des actions externes (Webhooks, scripts, API) basées sur ces intentions.

**Architecture utilisée :** Méthode "Force-Logging". On expose un outil à l'IA et on l'oblige (via System Prompt) à l'utiliser à chaque fin de réponse.

---

## 2. Prérequis techniques
* **Node.js** (v18 ou supérieur) installé.
* **NPM** (gestionnaire de paquets).
* Un éditeur de code (VS Code ou Cursor).
* Client IA compatible MCP (Claude Desktop ou Cursor).

---

## 3. Installation du Projet

Ouvrez un terminal et exécutez les commandes suivantes pour initialiser la structure :

```bash
# 1. Créer le dossier du projet
mkdir mcp-action-logger
cd mcp-action-logger

# 2. Initialiser le projet Node.js
npm init -y

# 3. Installer les dépendances de production
npm i @modelcontextprotocol/sdk zod

# 4. Installer les dépendances de développement (TypeScript & TSX)
npm i -D typescript @types/node tsx
```

---

## 4. Implémentation du Serveur (TypeScript)

Créez l'arborescence suivante : `src/index.ts`.

```typescript
import { appendFile } from 'node:fs/promises'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// --- CONFIGURATION ---
const SERVER_NAME = 'ActionLogger'
// Le fichier sera créé à la racine du projet où la commande est lancée
const LOG_FILE_PATH = join(process.cwd(), 'conversation_history.log')

// Initialisation du serveur
const server = new McpServer({
  name: SERVER_NAME,
  version: '1.0.0',
})

/**
 * Fonction simulacre pour déclencher des actions externes.
 * À remplacer par vos appels réels (axios, fetch, exec, etc.)
 */
const triggerExternalAction = async (actionType: string, _payload: string) => {
  // EXEMPLE : Appel vers Zapier / n8n / Slack
  // console.log ferait bugger le transport STDIO, on utilise console.error pour les logs
  console.error(`[ACTION TRIGGERED] Type: ${actionType}`)

  // Simulation d'un délai
  // await axios.post('[https://hooks.zapier.com/](https://hooks.zapier.com/)...', { data: payload });
}

// --- DÉFINITION DE L'OUTIL ---
server.registerTool(
  'log_exchange',
  {
    description:
      "Outil d'audit OBLIGATOIRE. Archive la conversation et vérifie les triggers.",
    inputSchema: {
      user_message: z.string().describe("Le dernier message de l'utilisateur"),
      assistant_response: z
        .string()
        .describe("La réponse complète de l'assistant"),
    },
  },
  async ({ user_message, assistant_response }) => {
    try {
      // 1. Écriture dans le fichier de log local
      const timestamp = new Date().toISOString()
      const logEntry = `[${timestamp}]\nUSER: ${user_message}\nAI: ${assistant_response}\n${'-'.repeat(50)}\n`

      await appendFile(LOG_FILE_PATH, logEntry, 'utf-8')

      // 2. Logique de détection (Triggers)
      const context = (user_message + assistant_response).toLowerCase()

      // --> CAS 1 : Déploiement
      if (context.includes('deploy') || context.includes('déploiement')) {
        await triggerExternalAction('DEPLOY_PIPELINE', assistant_response)
        return {
          content: [
            { type: 'text', text: 'Log OK. Pipeline de déploiement notifié.' },
          ],
        }
      }

      // --> CAS 2 : Création de ticket
      if (context.includes('bug') && context.includes('ticket')) {
        await triggerExternalAction('JIRA_TICKET', user_message)
        return {
          content: [
            { type: 'text', text: 'Log OK. Création de ticket demandée.' },
          ],
        }
      }

      // Retour standard
      return {
        content: [{ type: 'text', text: 'Conversation archivée avec succès.' }],
      }
    } catch (error) {
      return {
        content: [
          { type: 'text', text: `Erreur interne Logger: ${String(error)}` },
        ],
        isError: true,
      }
    }
  },
)

// --- DÉMARRAGE ---
const main = async () => {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`${SERVER_NAME} running on Stdio...`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

```

---

## 5. Configuration du Client IA

Vous devez indiquer à votre agent (Claude ou Cursor) où trouver ce serveur.

### Localisation du fichier de config
* **MacOS :** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows :** `%APPDATA%\Claude\claude_desktop_config.json`
* **Cursor :** Settings > Features > MCP > "Add New MCP Server"

### Configuration JSON

Ajoutez l'entrée suivante dans votre fichier JSON :

```json
{
  "mcpServers": {
    "action-logger": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/CHEMIN/ABSOLU/VERS/VOTRE/PROJET/mcp-action-logger/src/index.ts"
      ],
      "env": {
        "PATH": "/usr/local/bin:/usr/bin:/bin" 
      }
    }
  }
}
```

> **⚠️ Important :** > 1. Remplacez `/CHEMIN/ABSOLU/...` par le vrai chemin complet de votre dossier.
> 2. Sous Windows, remplacez les `/` par des `\\`.

---

## 6. Activation (Le Prompt Système)

Pour que le système fonctionne, l'IA doit être "forcée" d'utiliser l'outil. 

Ajoutez le texte suivant dans les **instructions personnalisées** (`.cursorrules` à la racine du projet ou "Custom Instructions" dans les paramètres).

```text
# SYSTEM INSTRUCTIONS (MANDATORY)

Tu disposes d'un outil critique nommé `log_exchange`.

RÈGLE ABSOLUE :
À la fin de CHAQUE tour de conversation (après avoir généré ta réponse), 
tu DOIS OBLIGATOIREMENT appeler l'outil `log_exchange`.

Paramètres à passer :
1. `user_message` : Le dernier message que je t'ai envoyé.
2. `assistant_response` : La réponse que tu viens de rédiger.

Fais cela silencieusement. C'est une procédure d'audit automatique.
```

---

## 7. Vérification et Tests

1.  **Redémarrer** Claude Desktop ou Cursor pour charger la nouvelle config.
2.  Vérifier que l'icône MCP (souvent une prise électrique) indique que `action-logger` est connecté (rond vert).
3.  **Test 1 (Logging simple) :**
    * Prompt : *"Bonjour, ceci est un test de log."*
    * Résultat attendu : Un fichier `conversation_history.log` apparaît dans le dossier du projet avec le texte.
4.  **Test 2 (Déclenchement d'action) :**
    * Prompt : *"Le code est validé, lance le déploiement en prod."*
    * Résultat attendu : L'IA répond qu'elle a notifié le pipeline. Si vous regardez les logs d'erreur (via la console MCP de Claude), vous verrez `[ACTION TRIGGERED] Type: DEPLOY_PIPELINE`.
