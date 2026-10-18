"""Génère les fichiers audio manquants : voix Grammatek (phonèmes islandais) et voix Piper Talrómur.

Usage : python3 scripts/generer-audio.py .audio-plan.json static/audio .piper .grammatek

- Lit le plan produit par scripts/plan-audio.ts (fichier, texte, voix, vitesse).
- Ne synthétise que les fichiers absents : les autres viennent du cache de la CI.
- Supprime les fichiers qui ne sont plus dans le plan (phrase corrigée ou retirée).
- Découpe chaque texte aux ponctuations et insère une vraie pause entre les morceaux :
  les voix enchaînent sinon « Nei, ég heiti… » ou « Frakklandi! Ég kem… » d'une traite.
- Sortie : MP3 mono, lisible partout (Safari compris).

Piper (piper1-gpl, GPL-3.0) sert seulement au build ; il n'est pas distribué avec l'appli.
"""

import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
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


# Pause après chaque morceau, en secondes (à vitesse 1 ; suit la lenteur du personnage).
PAUSES = {",": 0.28, ";": 0.32, ":": 0.32, ".": 0.55, "!": 0.55, "?": 0.55}
SEUIL_SILENCE = 0.01


def morceaux(texte: str) -> list[tuple[str, str]]:
    """« Nei, ég heiti Viktoriya. » → [(« Nei, », ","), (« ég heiti Viktoriya. », ".")]."""
    sortie = []
    for m in re.finditer(r"[^,;:.!?]+([,;:.!?]*)", texte):
        bout = m.group(0).strip()
        if re.search(r"[^\W\d_]", bout):
            sortie.append((bout, m.group(1)[-1:] if m.group(1) else ""))
    return sortie or [(texte, "")]


def rogner(audio: np.ndarray) -> np.ndarray:
    """Retire le silence de début et de fin d'un morceau : les pauses sont ajoutées à part."""
    fort = np.flatnonzero(np.abs(audio) > SEUIL_SILENCE * (float(np.abs(audio).max()) or 1.0))
    return audio[fort[0]:fort[-1] + 1] if fort.size else audio


def synthese(tache) -> tuple[np.ndarray, int]:
    global grammatek
    bouts, frequence = [], 22050
    liste = morceaux(tache["texte"])
    for i, (texte, ponctuation) in enumerate(liste):
        if tache["voix"] == "grammatek-steinn":
            # Sans marques d'accent : version jugée la plus juste à l'écoute.
            grammatek = grammatek or VoixGrammatek(dossier_grammatek, Path("contenu/prononciation.yaml"))
            audio, frequence = grammatek.audio(texte, tache["vitesse"], accents=False), grammatek.frequence
        else:
            v = voix(tache["voix"])
            reglage = SynthesisConfig(length_scale=tache["vitesse"], normalize_audio=False)
            audio = np.concatenate([c.audio_float_array for c in v.synthesize(texte, syn_config=reglage)])
            frequence = v.config.sample_rate
        bouts.append(rogner(audio))
        if i < len(liste) - 1:
            pause = PAUSES.get(ponctuation, 0.15) * tache["vitesse"]
            bouts.append(np.zeros(int(pause * frequence), dtype=np.float32))
    marge = np.zeros(int(0.08 * frequence), dtype=np.float32)
    return np.concatenate([marge, *bouts, marge]), frequence


crees = 0
for tache in plan:
    sortie = dossier_audio / Path(tache["fichier"]).name
    if sortie.exists():
        continue
    audio, frequence = synthese(tache)
    crete = float(np.abs(audio).max()) or 1.0
    pcm = (audio / crete * 0.9 * 32767).astype(np.int16)  # normalisation à -1 dB
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(frequence)
            wav.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name,
             "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "5", str(sortie)],
            check=True,
        )
    if sortie.stat().st_size < 1000:
        sys.exit(f"Fichier audio anormalement court : {sortie} ({tache['texte']})")
    crees += 1
    print(f"créé : {sortie.name}  [{tache['voix']} × {tache['vitesse']}]  {tache['texte']}")

print(f"Audio : {len(plan)} sons, {crees} générées, {len(plan) - crees} reprises du cache.")
