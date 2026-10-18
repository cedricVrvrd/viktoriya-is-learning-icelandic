"""Page d'écoute comparative des voix, pour juger à l'oreille.

Usage : python3 scripts/essais-audio.py static/essais-audio .piper .grammatek

Produit static/essais-audio/index.html et les sons, publiés avec le site
(…/superpuffin/essais-audio/), hors cache hors ligne.

Compare, phrase par phrase, les voix Piper actuelles (lues par eSpeak) avec la voix
Steinn de Grammatek, qui reçoit les phonèmes d'un dictionnaire de prononciation
islandais (scripts/phonetiseur.py).
"""

import html
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

sys.path.insert(0, str(Path(__file__).parent))
from voix_grammatek import VoixGrammatek  # noqa: E402

sortie, dossier_piper, dossier_grammatek = (Path(a) for a in sys.argv[1:4])
sortie.mkdir(parents=True, exist_ok=True)

ESSAIS = ["Já!", "Halló!", "Hæ!", "Hvað heitir þú?", "Takk!", "Nei, ég heiti Viktoriya."]
# Le choix des voix est fait (Grammatek sans accents) : la page garde seulement quelques
# phrases témoins, pour réécouter les voix après une mise à jour de Piper ou du lexique.
PHRASES = ESSAIS

COLONNES = [
    ("salka", "Salka (Piper, actuelle)"),
    ("steinn", "Steinn (Piper, actuelle)"),
    ("g", "Steinn Grammatek"),
    ("g-sans", "Grammatek, sans marques d'accent"),
    ("g-lent", "Grammatek, plus lent (1,15)"),
]


def mp3(wav: str, cible: Path):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-ac", "1",
                    "-codec:a", "libmp3lame", "-q:a", "4", str(cible)], check=True)


def piper(nom: str) -> PiperVoice:
    modele = dossier_piper / f"{nom}.onnx"
    if not modele.exists():
        subprocess.run([sys.executable, "-m", "piper.download_voices", "--data-dir", str(dossier_piper), nom], check=True)
    return PiperVoice.load(modele)


salka, steinn = piper("is_IS-salka-medium"), piper("is_IS-steinn-medium")
grammatek = VoixGrammatek(dossier_grammatek, Path("contenu/prononciation.yaml"))

lignes = []
for i, phrase in enumerate(PHRASES):
    cellules = []
    for cle, _ in COLONNES:
        fichier = f"{i:02d}-{cle}.mp3"
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            if cle in ("salka", "steinn"):
                with wave.open(tmp.name, "wb") as w:
                    (salka if cle == "salka" else steinn).synthesize_wav(phrase, w, syn_config=SynthesisConfig())
            else:
                grammatek.ecrire_wav(phrase, Path(tmp.name), vitesse=1.15 if cle == "g-lent" else 1.0,
                                     accents=cle != "g-sans")
            mp3(tmp.name, sortie / fichier)
        cellules.append(f'<td><audio controls preload="none" src="{fichier}"></audio></td>')
    phonemes = "".join(grammatek.phonetiseur.phrase(phrase))
    lignes.append(f'<tr><th><span lang="is">{html.escape(phrase)}</span><br>'
                  f'<small class="api">/{html.escape(phonemes)}/</small></th>{"".join(cellules)}</tr>')
print(f"Essais : {len(PHRASES)} phrases × {len(COLONNES)} voix")

entete = "".join(f"<th>{html.escape(titre)}</th>" for _, titre in COLONNES)
(sortie / "index.html").write_text(f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="content-security-policy" content="default-src 'self'; style-src 'unsafe-inline'">
<meta name="robots" content="noindex">
<title>Essais de voix — Viktoriya is learning Icelandic</title>
<style>
body{{font:16px/1.45 system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#0b1e3f}}
h1{{font-size:1.4rem}}
table{{border-collapse:collapse;display:block;overflow-x:auto}}
th,td{{padding:6px;border-bottom:1px solid #d3dcea;text-align:left;vertical-align:middle}}
thead th{{font-size:.85rem;min-width:150px}}
.api{{color:#4a5a75;font-weight:400}}
audio{{width:150px;height:36px}}
@media (prefers-color-scheme:dark){{body{{background:#0b1e3f;color:#eef3fa}} th,td{{border-color:#27467a}} .api{{color:#a9b8d0}}}}
</style></head><body>
<h1>Essais de voix</h1>
<p>Les voix Piper actuelles lisent le texte avec eSpeak, un phonétiseur générique.
La voix Steinn de Grammatek reçoit la prononciation d'un dictionnaire islandais (transcription affichée sous chaque phrase).
Pour chaque phrase, note la colonne la plus juste.</p>
<table><thead><tr><th>Phrase</th>{entete}</tr></thead><tbody>
{"".join(lignes)}
</tbody></table>
</body></html>
""", encoding="utf-8")
