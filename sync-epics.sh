#!/usr/bin/env bash
# Actualiza las ramas epic1..epic9 con el contenido de dev.
# Uso: ./sync-epics.sh [rama_base] [primera] [ultima]
# Ejemplos:
#   ./sync-epics.sh             -> dev, epic1..epic9
#   ./sync-epics.sh dev 5 9     -> dev, solo epic5..epic9

BASE="${1:-dev}"
START="${2:-1}"
END="${3:-9}"

fail() { echo "ERROR: $1"; exit 1; }

# No arrancar si hay un merge a medias o cambios sin commitear
if git rev-parse -q --verify MERGE_HEAD >/dev/null; then
  fail "Hay un merge en curso. Resuélvelo (git add + git commit) o cancélalo (git merge --abort) y vuelve a correr el script."
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  fail "Tienes cambios sin commitear. Haz commit o stash antes de correr el script."
fi

git fetch --all --prune || fail "No se pudo hacer fetch."

git checkout "$BASE" || fail "No se pudo cambiar a $BASE."
git pull origin "$BASE" || fail "No se pudo actualizar $BASE."

for i in $(seq "$START" "$END"); do
  b="epic$i"
  echo ""
  echo "=== $b ==="

  if git show-ref --verify --quiet "refs/heads/$b"; then
    # Existe en local
    git checkout "$b" || fail "No se pudo cambiar a $b."
    if git show-ref --verify --quiet "refs/remotes/origin/$b"; then
      git pull --no-edit origin "$b" || fail "Falló el pull de $b."
    fi
  elif git show-ref --verify --quiet "refs/remotes/origin/$b"; then
    # Solo existe en remoto: crear local siguiendo al remoto
    echo "Creando $b local desde origin/$b"
    git checkout -b "$b" --track "origin/$b" || fail "No se pudo crear $b."
  else
    # No existe en ningún lado: crearla desde la base y subirla
    echo "$b no existe, creándola desde $BASE"
    git checkout -b "$b" "$BASE" || fail "No se pudo crear $b."
    git push -u origin "$b" || fail "No se pudo subir $b."
    continue
  fi

  # Si ya contiene todo lo de la base, no hay nada que hacer
  if git merge-base --is-ancestor "$BASE" "$b"; then
    echo "$b ya está al día con $BASE."
    continue
  fi

  if ! git merge --no-edit "$BASE"; then
    echo ""
    echo "CONFLICTO en $b."
    echo "Resuélvelo, luego:  git add <archivos> && git commit && git push origin $b"
    echo "Después vuelve a correr:  ./sync-epics.sh $BASE $((i + 1)) $END"
    exit 1
  fi

  git push origin "$b" || fail "No se pudo subir $b."
  echo "$b actualizada y subida."
done

git checkout "$BASE"
echo ""
echo "Listo: todas las ramas epic$START..epic$END están al día con $BASE."
