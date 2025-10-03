#!/usr/bin/env bash
# macOS-friendly (bash 3.2), no globstar required
set -euo pipefail

# Lecture whitelist depuis fichier ou stdin
WHITELIST_FILE="${1:-}" # si pas d'argument, vide
if [[ -n "$WHITELIST_FILE" && "$WHITELIST_FILE" != "-" ]]; then
  if [[ ! -f "$WHITELIST_FILE" ]]; then
    echo "File $WHITELIST_FILE not found" >&2
    exit 1
  fi
  exec 3<"$WHITELIST_FILE"
elif [[ "$WHITELIST_FILE" == "-" ]]; then
  exec 3<&0
else
  echo "No whitelist file provided and not reading from stdin" >&2
  exit 1
fi

# Petite fonction utilitaire pour trim
trim() {
  local s="$1"
  # supprime espaces début/fin
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

# Échappe rien : on confie la *pattern expansion* à find via -path / -name
# IMPORTANT: on QUOTE les patterns pour éviter l'expansion par le shell.

# On collecte et déduplique via awk (compatible macOS)
results_tmp="$(mktemp)"
trap 'rm -f "$results_tmp"' EXIT

while IFS= read -r raw <&3 || [[ -n "$raw" ]]; do
  pattern="$(trim "$raw")"
  # Ignore lignes vides et commentaires
  [[ -z "$pattern" || "$pattern" == \#* ]] && continue

  # Normaliser : enlever un éventuel prefixe "./"
  if [[ "$pattern" == ./* ]]; then
    pattern="${pattern#./}"
  fi

  # 1) Aucun wildcard → chemin exact
  if [[ "$pattern" != *[\*\?\[]* ]]; then
    if [[ -f "$pattern" ]]; then
      printf '%s\n' "$pattern" >> "$results_tmp"
    fi
    continue
  fi

  # 2) Patterns récursifs (présence de '**')
  if [[ "$pattern" == *"**"* ]]; then
    # find comprend -path avec * et ? (pas besoin de ** : '**' ~ '*')
    # On ancre sur ./ pour éviter de matcher ailleurs
    find . -type f -path "./$pattern" -print >> "$results_tmp"
    continue
  fi

  # 3) Patterns non récursifs sans '**'
  #    - cas dir/*, dir/*.js … : limiter à la profondeur 1
  if [[ "$pattern" == */* ]]; then
    base_dir="${pattern%/*}"   # partie dossier
    name_pat="${pattern##*/}"  # partie nom (peut contenir * ? [])
    # Si le dossier n'existe pas, on skip
    [[ -d "$base_dir" ]] || continue

    # Si le nom contient des wildcards → -name ; sinon -path exact
    if [[ "$name_pat" == *[\*\?\[]* ]]; then
      find "$base_dir" -maxdepth 1 -type f -name "$name_pat" -print >> "$results_tmp"
    else
      # chemin exact sous base_dir
      find "$base_dir" -maxdepth 1 -type f -path "./$base_dir/$name_pat" -print >> "$results_tmp"
    fi
    continue
  fi

  # 4) Sinon, pattern simple de nom (ex: *.md) à la racine, non récursif
  find . -maxdepth 1 -type f -name "$pattern" -print >> "$results_tmp"
done

awk '!seen[$0]++' "$results_tmp"