{{/*
Expand the name of the chart.
*/}}
{{- define "packmind.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "packmind.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "packmind.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "packmind.labels" -}}
helm.sh/chart: {{ include "packmind.chart" . }}
{{ include "packmind.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "packmind.selectorLabels" -}}
app.kubernetes.io/name: {{ include "packmind.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "packmind.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "packmind.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Conditionally render serviceAccountName field
Only renders the field if a service account is configured
*/}}
{{- define "packmind.serviceAccountNameField" -}}
{{- if or .Values.serviceAccount.create .Values.serviceAccount.name }}
serviceAccountName: {{ include "packmind.serviceAccountName" . }}
{{- end }}
{{- end }}

{{/*
API specific labels
*/}}
{{- define "packmind.api.labels" -}}
{{ include "packmind.labels" . }}
app.kubernetes.io/component: api
{{- with .Values.api.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
API selector labels
*/}}
{{- define "packmind.api.selectorLabels" -}}
{{ include "packmind.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
Frontend specific labels
*/}}
{{- define "packmind.frontend.labels" -}}
{{ include "packmind.labels" . }}
app.kubernetes.io/component: frontend
{{- with .Values.frontend.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "packmind.frontend.selectorLabels" -}}
{{ include "packmind.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
MCP Server specific labels
*/}}
{{- define "packmind.mcpServer.labels" -}}
{{ include "packmind.labels" . }}
app.kubernetes.io/component: mcp-server
{{- with .Values.mcpServer.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
MCP Server selector labels
*/}}
{{- define "packmind.mcpServer.selectorLabels" -}}
{{ include "packmind.selectorLabels" . }}
app.kubernetes.io/component: mcp-server
{{- end }}

{{/*
Redis specific labels
*/}}
{{- define "packmind.redis.labels" -}}
{{ include "packmind.labels" . }}
app.kubernetes.io/component: redis
{{- with .Values.redis.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Redis selector labels
*/}}
{{- define "packmind.redis.selectorLabels" -}}
{{ include "packmind.selectorLabels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{/*
PostgreSQL specific labels
*/}}
{{- define "packmind.postgresql.labels" -}}
{{ include "packmind.labels" . }}
app.kubernetes.io/component: postgresql
{{- with .Values.postgresql.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "packmind.postgresql.selectorLabels" -}}
{{ include "packmind.selectorLabels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
Common annotations
*/}}
{{- define "packmind.annotations" -}}
{{- with .Values.global.annotations }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Database URL helper
*/}}
{{- define "packmind.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgres://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "packmind.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.postgresql.external.databaseUrl }}
{{- end }}
{{- end }}

{{/*
Redis URI helper
*/}}
{{- define "packmind.redisUri" -}}
{{- if .Values.redis.enabled }}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s-redis:6379" .Values.redis.auth.password (include "packmind.fullname" .) }}
{{- else }}
{{- printf "redis://%s-redis:6379" (include "packmind.fullname" .) }}
{{- end }}
{{- else }}
{{- .Values.redis.external.uri }}
{{- end }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "packmind.imagePullSecrets" -}}
{{- $imagePullSecrets := list -}}
{{- if .Values.imagePullSecrets -}}
  {{- $imagePullSecrets = .Values.imagePullSecrets -}}
{{- end -}}
{{- if and .Values.dockerRegistry.enabled (not .Values.dockerRegistry.existingSecret) -}}
  {{- $registrySecret := dict "name" (printf "%s-registry-secret" (include "packmind.fullname" .)) -}}
  {{- $imagePullSecrets = append $imagePullSecrets $registrySecret -}}
{{- else if .Values.dockerRegistry.existingSecret -}}
  {{- $registrySecret := dict "name" .Values.dockerRegistry.existingSecret -}}
  {{- $imagePullSecrets = append $imagePullSecrets $registrySecret -}}
{{- end -}}
{{- if $imagePullSecrets }}
imagePullSecrets:
{{- toYaml $imagePullSecrets | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Security Context - with service-specific override support
*/}}
{{- define "packmind.securityContext" -}}
{{- $context := .context -}}
{{- $component := .component -}}
{{- $componentSecurityContext := index .context.Values $component "securityContext" | default dict -}}
{{- $globalSecurityContext := .context.Values.securityContext | default dict -}}
{{- $mergedSecurityContext := merge $componentSecurityContext $globalSecurityContext -}}
{{- toYaml $mergedSecurityContext | nindent 12 }}
{{- end }}

{{/*
Pod Security Context - with service-specific override support
*/}}
{{- define "packmind.podSecurityContext" -}}
{{- $context := .context -}}
{{- $component := .component -}}
{{- $componentPodSecurityContext := index .context.Values $component "podSecurityContext" | default dict -}}
{{- $globalPodSecurityContext := .context.Values.podSecurityContext | default dict -}}
{{- $mergedPodSecurityContext := merge $componentPodSecurityContext $globalPodSecurityContext -}}
{{- toYaml $mergedPodSecurityContext | nindent 8 }}
{{- end }}

{{/*
Conditionally render securityContext field
Only renders the field if security context values are configured
*/}}
{{- define "packmind.securityContextField" -}}
{{- $context := .context -}}
{{- $component := .component -}}
{{- $componentSecurityContext := index .context.Values $component "securityContext" | default dict -}}
{{- $globalSecurityContext := .context.Values.securityContext | default dict -}}
{{- if and (kindIs "map" $componentSecurityContext) (kindIs "map" $globalSecurityContext) -}}
{{- $mergedSecurityContext := merge $componentSecurityContext $globalSecurityContext -}}
{{- if $mergedSecurityContext }}
securityContext:
  {{- toYaml $mergedSecurityContext | nindent 2 }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Conditionally render podSecurityContext field
Only renders the field if pod security context values are configured
*/}}
{{- define "packmind.podSecurityContextField" -}}
{{- $context := .context -}}
{{- $component := .component -}}
{{- $componentPodSecurityContext := index .context.Values $component "podSecurityContext" | default dict -}}
{{- $globalPodSecurityContext := .context.Values.podSecurityContext | default dict -}}
{{- if and (kindIs "map" $componentPodSecurityContext) (kindIs "map" $globalPodSecurityContext) -}}
{{- $mergedPodSecurityContext := merge $componentPodSecurityContext $globalPodSecurityContext -}}
{{- if $mergedPodSecurityContext }}
securityContext:
  {{- toYaml $mergedPodSecurityContext | nindent 2 }}
{{- end }}
{{- end }}
{{- end }}


{{/*
Backend services environment variables (API and MCP only)
*/}}
{{- define "packmind.backendEnvVars" -}}
{{- if .Values.postgresql.enabled }}
- name: DATABASE_URL
  value: {{ include "packmind.databaseUrl" . | quote }}
{{- else if .Values.postgresql.external.databaseUrl }}
- name: DATABASE_URL
  value: {{ .Values.postgresql.external.databaseUrl | quote }}
{{- else if .Values.postgresql.external.existingSecret }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.postgresql.external.existingSecret }}
      key: {{ .Values.postgresql.external.existingSecretKey | default "database-url" }}
{{- end }}
{{- if .Values.redis.enabled }}
- name: REDIS_URI
  value: {{ include "packmind.redisUri" . | quote }}
{{- else if .Values.redis.external.uri }}
- name: REDIS_URI
  value: {{ .Values.redis.external.uri | quote }}
{{- else if .Values.redis.external.existingSecret }}
- name: REDIS_URI
  valueFrom:
    secretKeyRef:
      name: {{ .Values.redis.external.existingSecret }}
      key: {{ .Values.redis.external.existingSecretKey | default "redis-uri" }}
{{- end }}
{{- end }}

{{/*
Secret environment variables helper
*/}}
{{- define "packmind.secretEnvVars" -}}
{{- $component := .component -}}
{{- $context := .context -}}
{{- if eq $component "api" }}
{{- if or $context.Values.secrets.api.jwtSecretKey $context.Values.secrets.existing.apiSecret }}
- name: API_JWT_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $context.Values.secrets.existing.apiSecret | default (printf "%s-api-secrets" (include "packmind.fullname" $context)) }}
      key: api-jwt-secret-key
{{- end }}
{{- if or $context.Values.secrets.api.encryptionKey $context.Values.secrets.existing.apiSecret }}
- name: ENCRYPTION_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $context.Values.secrets.existing.apiSecret | default (printf "%s-api-secrets" (include "packmind.fullname" $context)) }}
      key: encryption-key
{{- end }}
{{- if or $context.Values.secrets.api.openaiApiKey $context.Values.secrets.existing.apiSecret }}
- name: OPENAI_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $context.Values.secrets.existing.apiSecret | default (printf "%s-api-secrets" (include "packmind.fullname" $context)) }}
      key: openai-api-key
      optional: true
{{- end }}
{{- else if eq $component "mcpServer" }}
{{- if or $context.Values.secrets.mcp.jwtSecretKey $context.Values.secrets.existing.mcpSecret }}
- name: MCP_JWT_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $context.Values.secrets.existing.mcpSecret | default (printf "%s-mcp-secrets" (include "packmind.fullname" $context)) }}
      key: mcp-jwt-secret-key
{{- end }}
{{- if or $context.Values.secrets.api.openaiApiKey $context.Values.secrets.existing.apiSecret }}
- name: OPENAI_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ $context.Values.secrets.existing.apiSecret | default (printf "%s-api-secrets" (include "packmind.fullname" $context)) }}
      key: openai-api-key
      optional: true
{{- end }}
{{- end }}
{{- end }}

{{/*
Service-specific environment variables
*/}}
{{- define "packmind.serviceEnvVars" -}}
{{- $component := .component -}}
{{- $context := .context -}}
{{- $serviceValues := index $context.Values $component -}}
{{- range $key, $value := $serviceValues.env }}
- name: {{ $key }}
  value: {{ $value | quote }}
{{- end }}
{{- end }}

{{/*
Dynamic secret environment variables helper
Allows defining arbitrary environment variables from secrets
*/}}
{{- define "packmind.dynamicSecretEnvVars" -}}
{{- $component := .component -}}
{{- $context := .context -}}
{{- $serviceValues := index $context.Values $component -}}
{{- if $serviceValues.secretEnvVars }}
{{- range $serviceValues.secretEnvVars }}
- name: {{ .name }}
  valueFrom:
    secretKeyRef:
      name: {{ .secretName }}
      key: {{ .key }}
      {{- if .optional }}
      optional: {{ .optional }}
      {{- end }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Complete environment variables for a service
*/}}
{{- define "packmind.allEnvVars" -}}
{{- $component := .component -}}
{{- if or (eq $component "api") (eq $component "mcpServer") }}
{{- include "packmind.backendEnvVars" .context }}
{{- include "packmind.secretEnvVars" . }}
{{- include "packmind.dynamicSecretEnvVars" . }}
{{- end }}
{{- include "packmind.serviceEnvVars" . }}
{{- end }}

{{/*
Consistent annotations helper
*/}}
{{- define "packmind.mergedAnnotations" -}}
{{- $serviceAnnotations := .serviceAnnotations | default dict -}}
{{- $globalAnnotations := include "packmind.annotations" .context -}}
{{- if or $serviceAnnotations $globalAnnotations }}
annotations:
  {{- if $serviceAnnotations }}
  {{- toYaml $serviceAnnotations | nindent 2 }}
  {{- end }}
  {{- if $globalAnnotations }}
  {{- $globalAnnotations | nindent 2 }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Service-specific volume mounts
*/}}
{{- define "packmind.serviceVolumeMounts" -}}
{{- $component := .component -}}
{{- $context := .context -}}
{{- $serviceValues := index $context.Values $component -}}
{{- if and (or (eq $component "api") (eq $component "mcpServer")) $serviceValues.caCerts.enabled }}
- name: ca-certs
  mountPath: /ca-certs
  readOnly: true
{{- end }}
{{- if $context.Values.configMaps }}
{{- range $name, $config := $context.Values.configMaps }}
- name: {{ $name }}
  mountPath: {{ if eq $component "frontend" }}/usr/share/nginx/html/config/{{ $name }}{{ else }}/app/config/{{ $name }}{{ end }}
  readOnly: true
{{- end }}
{{- end }}
{{- end }}

{{/*
Service-specific volumes
*/}}
{{- define "packmind.serviceVolumes" -}}
{{- $component := .component -}}
{{- $context := .context -}}
{{- $serviceValues := index $context.Values $component -}}
{{- if and (or (eq $component "api") (eq $component "mcpServer")) $serviceValues.caCerts.enabled }}
- name: ca-certs
  secret:
    secretName: {{ $serviceValues.caCerts.secret.name }}
{{- end }}
{{- if $context.Values.configMaps }}
{{- range $name, $config := $context.Values.configMaps }}
- name: {{ $name }}
  configMap:
    name: {{ include "packmind.fullname" $context }}-{{ $name }}
{{- end }}
{{- end }}
{{- end }}
