"""Page d'écoute comparative des réglages de voix, pour juger à l'oreille.

Usage : python3 scripts/essais-audio.py static/essais-audio .piper

Produit static/essais-audio/index.html et les sons, publiés avec le site
(…/superpuffin/essais-audio/). Chaque phrase test est générée avec plusieurs
réglages, pour isoler l'origine d'un défaut :
  A  réglage actuel de l'appli (MP3)
  B  même son, sans compression (WAV) : le MP3 est-il en cause ?
  C  point final au lieu du point d'exclamation : l'intonation est-elle en cause ?
  D  moins de « bruit » de synthèse (voix plus stable, moins soufflée)
  E  C + D + fin du son coupée net (souffle final retiré)
"""

import html
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

sortie, dossier_voix = Path(sys.argv[1]), Path(sys.argv[2])
sortie.mkdir(parents=True, exist_ok=True)

PHRASES = ["Já!", "Halló!", "Hæ!", "Hvað heitir þú?"]
VOIX = ["is_IS-bui-medium", "is_IS-salka-medium", "is_IS-steinn-medium", "is_IS-ugla-medium"]
VARIANTES = {
    "A": dict(point=False, bruit=None, coupe=False, format="mp3", titre="actuel"),
    "B": dict(point=False, bruit=None, coupe=False, format="wav", titre="sans compression"),
    "C": dict(point=True, bruit=None, coupe=False, format="mp3", titre="point final"),
    "D": dict(point=False, bruit=(0.333, 0.333), coupe=False, format="mp3", titre="moins de bruit"),
    "E": dict(point=True, bruit=(0.333, 0.333), coupe=True, format="mp3", titre="C + D + fin coupée"),
}
# Fin coupée : retire la traîne sous -30 dB (souffle), puis fondu de 40 ms.
FILTRE_COUPE = "areverse,silenceremove=start_periods=1:start_threshold=-30dB,afade=t=in:d=0.04,areverse"


def charger(nom: str) -> PiperVoice:
    modele = dossier_voix / f"{nom}.onnx"
    if not modele.exists():
        subprocess.run([sys.executable, "-m", "piper.download_voices", "--data-dir", str(dossier_voix), nom], check=True)
    return PiperVoice.load(modele)


lignes = []
for nom_voix in VOIX:
    voix = charger(nom_voix)
    court = nom_voix.split("-")[1].capitalize()
    lignes.append(f"<h2>{court}</h2><table><tr><th>Phrase</th>" +
                  "".join(f"<th>{k}<br><small>{html.escape(v['titre'])}</small></th>" for k, v in VARIANTES.items()) + "</tr>")
    for i, phrase in enumerate(PHRASES):
        cellules = []
        for cle, v in VARIANTES.items():
            texte = phrase.replace("!", ".") if v["point"] else phrase
            bruit = dict(noise_scale=v["bruit"][0], noise_w_scale=v["bruit"][1]) if v["bruit"] else {}
            reglage = SynthesisConfig(length_scale=1.0, normalize_audio=True, **bruit)
            fichier = f"{court.lower()}-{i}-{cle}.{v['format']}"
            with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
                with wave.open(tmp.name, "wb") as wav:
                    voix.synthesize_wav(texte, wav, syn_config=reglage)
                commande = ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, "-ac", "1"]
                if v["coupe"]:
                    commande += ["-af", FILTRE_COUPE]
                if v["format"] == "mp3":
                    commande += ["-codec:a", "libmp3lame", "-q:a", "5"]
                subprocess.run(commande + [str(sortie / fichier)], check=True)
            cellules.append(f'<td><audio controls preload="none" src="{fichier}"></audio></td>')
        lignes.append(f'<tr><th lang="is">{html.escape(phrase)}</th>{"".join(cellules)}</tr>')
    lignes.append("</table>")
    print(f"{court} : {len(PHRASES) * len(VARIANTES)} essais")

legende = "".join(f"<li><b>{k}</b> — {html.escape(v['titre'])}</li>" for k, v in VARIANTES.items())
(sortie / "index.html").write_text(f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="content-security-policy" content="default-src 'self'; style-src 'unsafe-inline'">
<meta name="robots" content="noindex">
<title>Essais de voix — Superpuffin</title>
<style>
body{{font:16px/1.45 system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#0b1e3f}}
h1{{font-size:1.4rem}} h2{{margin-top:2rem;color:#02529c}}
table{{border-collapse:collapse;display:block;overflow-x:auto}}
th,td{{padding:6px;border-bottom:1px solid #d3dcea;text-align:left;vertical-align:middle}}
audio{{width:150px;height:36px}}
@media (prefers-color-scheme:dark){{body{{background:#0b1e3f;color:#eef3fa}} h2{{color:#5aa6ef}} th,td{{border-color:#27467a}}}}
</style></head><body>
<h1>Essais de voix</h1>
<p>Même phrase, plusieurs réglages, voix à vitesse normale. Note pour chaque voix la colonne qui sonne le plus juste.</p>
<ul>{legende}</ul>
{"".join(lignes)}
</body></html>
""", encoding="utf-8")
