"""Synthèse avec la voix Steinn de Grammatek (Apache-2.0), à partir de phonèmes IPA.

La voix a été entraînée sur des transcriptions ice-g2p, pas sur eSpeak : on lui passe
directement les phonèmes produits par scripts/phonetiseur.py.
Sa configuration utilise un format que Piper 1.8 ne lit pas tel quel (type de phonèmes
« ice_g2p », identifiants en entiers) : on en écrit une copie adaptée.
"""

import json
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig
from piper.phoneme_ids import phonemes_to_ids

from phonetiseur import Phonetiseur


class VoixGrammatek:
    def __init__(self, dossier: Path, lexique_projet: Path):
        modele = dossier / "voix" / "is-steinn-xs-ipa.onnx"
        config = dossier / "voix" / "is-steinn-xs-ipa.onnx.json"
        donnees = json.loads(config.read_text(encoding="utf-8"))
        donnees["phoneme_type"] = "text"
        donnees["phoneme_id_map"] = {k: [v] for k, v in donnees["phoneme_id_map"].items()}
        adaptee = dossier / "is-steinn-xs-ipa.piper.json"
        adaptee.write_text(json.dumps(donnees, ensure_ascii=False), encoding="utf-8")
        self.voix = PiperVoice.load(modele, config_path=adaptee)
        self.phonetiseur = Phonetiseur(dossier / "g2p", lexique_projet, config)

    def ecrire_wav(self, texte: str, sortie: Path, vitesse: float = 1.0, accents: bool = True):
        jetons = self.phonetiseur.phrase(texte)
        if not accents:
            jetons = [j for j in jetons if j not in ("ˈ", "ˌ")]
        ids = phonemes_to_ids(jetons, self.voix.config.phoneme_id_map)
        audio = self.voix.phoneme_ids_to_audio(ids, SynthesisConfig(length_scale=vitesse))
        audio = audio[0] if isinstance(audio, tuple) else audio
        crete = float(np.abs(audio).max()) or 1.0
        pcm = (audio / crete * 0.9 * 32767).astype(np.int16)  # normalisation à -1 dB
        with wave.open(str(sortie), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(self.voix.config.sample_rate)
            w.writeframes(pcm.tobytes())
