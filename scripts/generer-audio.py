"""Génère les fichiers audio manquants : voix Grammatek (phonèmes islandais) et voix Piper Talrómur.

Usage : python3 scripts/generer-audio.py .audio-plan.json static/audio .piper .grammatek

- Lit le plan produit par scripts/plan-audio.ts (fichier, texte, voix, vitesse).
- Ne synthétise que les fichiers absents : les autres viennent du cache de la CI.
- Supprime les fichiers qui ne sont plus dans le plan (phrase corrigée ou retirée).
- Sortie : MP3 mono, lisible partout (Safari compris).

Piper (piper1-gpl, GPL-3.0) sert seulement au build ; il n'est pas distribué avec l'appli.
"""

import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

sys.path.insert(0, str(Path(__file__).parent))
from voix_grammatek import VoixGrammatek  # noqa: E402

plan_json, dossier_audio, dossier_voix, dossier_grammatek = (Path(a) for a in sys.argv[1:5])
plan = json.loads(plan_json.read_text(encoding="utf-8"))
dossier_audio.mkdir(parents=True, exist_ok=True)

attendus = {Path(t["fichier"]).name for t in plan}
for orphelin in dossier_audio.glob("*.mp3"):
    if orphelin.name not in attendus:
        orphelin.unlink()
        print(f"supprimé (plus utilisé) : {orphelin.name}")

voix_chargees: dict[str, PiperVoice] = {}
grammatek: VoixGrammatek | None = None


def voix(nom: str) -> PiperVoice:
    if nom not in voix_chargees:
        modele = dossier_voix / f"{nom}.onnx"
        if not modele.exists():
            subprocess.run(
                [sys.executable, "-m", "piper.download_voices", "--data-dir", str(dossier_voix), nom],
                check=True,
            )
        voix_chargees[nom] = PiperVoice.load(modele)
    return voix_chargees[nom]


crees = 0
for tache in plan:
    sortie = dossier_audio / Path(tache["fichier"]).name
    if sortie.exists():
        continue
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        if tache["voix"] == "grammatek-steinn":
            # Sans marques d'accent : version jugée la plus juste à l'écoute.
            grammatek = grammatek or VoixGrammatek(dossier_grammatek, Path("contenu/prononciation.yaml"))
            grammatek.ecrire_wav(tache["texte"], Path(tmp.name), vitesse=tache["vitesse"], accents=False)
        else:
            reglage = SynthesisConfig(length_scale=tache["vitesse"], normalize_audio=True)
            with wave.open(tmp.name, "wb") as wav:
                voix(tache["voix"]).synthesize_wav(tache["texte"], wav, syn_config=reglage)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name,
             "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "5", str(sortie)],
            check=True,
        )
    if sortie.stat().st_size < 1000:
        sys.exit(f"Fichier audio anormalement court : {sortie} ({tache['texte']})")
    crees += 1
    print(f"créé : {sortie.name}  [{tache['voix']} × {tache['vitesse']}]  {tache['texte']}")

print(f"Audio : {len(plan)} phrases, {crees} générées, {len(plan) - crees} reprises du cache.")
