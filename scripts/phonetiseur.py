"""Phonétiseur islandais pour la voix Steinn de Grammatek (is-steinn-xs-ipa).

Cette voix ne lit pas le texte : elle attend des phonèmes IPA, comme ceux produits
par ice-g2p (Grammatek, Apache-2.0). Plutôt que d'installer ice-g2p (qui dépend de
fairseq, difficile à installer), on utilise directement son dictionnaire de
prononciation standard, complété par contenu/prononciation.yaml pour les mots absents
(noms propres, formes contractées). Un mot introuvable fait échouer la génération :
aucune prononciation n'est devinée.

Format de sortie : liste de jetons (« ˈ », « h », « auː », « ␣ », « ! »…) que la voix
transforme en identifiants avec piper.phoneme_ids.phonemes_to_ids.
"""

import csv
import json
import re
import unicodedata
from pathlib import Path

import yaml

PONCTUATION = set("!?.,;:")


class Phonetiseur:
    def __init__(self, dossier_g2p: Path, lexique_projet: Path, config_voix: Path):
        donnees = dossier_g2p / "ice_g2p"
        self.sampa_ipa = {}
        with open(donnees / "data" / "sampa_ipa_single_flite.csv", encoding="utf-8") as f:
            for ligne in csv.DictReader(f, delimiter="\t"):
                self.sampa_ipa[ligne["SAMPA"]] = ligne["IPA"]
        self.dico = {}
        with open(donnees / "dictionaries" / "ice_pron_dict_standard_clear.csv", encoding="utf-8") as f:
            for ligne in f:
                mot, _, pron = ligne.rstrip("\n").partition("\t")
                self.dico.setdefault(mot, pron)
        if lexique_projet.exists():
            for entree in yaml.safe_load(lexique_projet.read_text(encoding="utf-8")) or []:
                self.dico[entree["mot"].lower()] = entree["sampa"]
        self.symboles = set(json.loads(config_voix.read_text(encoding="utf-8"))["phoneme_id_map"])

    def mot(self, mot: str) -> list[str]:
        cle = unicodedata.normalize("NFC", mot).lower()
        if cle not in self.dico:
            raise KeyError(f"Prononciation inconnue : « {mot} ». Ajoute-la dans contenu/prononciation.yaml.")
        jetons = []
        for s in self.dico[cle].split():
            if s not in self.sampa_ipa:
                raise KeyError(f"Symbole SAMPA inconnu « {s} » dans « {mot} »")
            jetons.append(self.sampa_ipa[s])
        # En islandais, l'accent principal tombe toujours sur la première syllabe.
        return ["ˈ", *jetons]

    def phrase(self, texte: str) -> list[str]:
        jetons: list[str] = []
        for morceau in re.findall(r"[^\W\d_]+|[!?.,;:]", unicodedata.normalize("NFC", texte)):
            if morceau in PONCTUATION:
                jetons.append(morceau)
            else:
                if jetons:
                    jetons.append(" ")
                jetons.extend(self.mot(morceau))
        inconnus = [j for j in jetons if j not in self.symboles]
        if inconnus:
            raise KeyError(f"Symboles absents de la voix : {inconnus} dans « {texte} »")
        return jetons

    def inconnus(self, textes: list[str]) -> list[str]:
        mots = {m.lower() for t in textes for m in re.findall(r"[^\W\d_]+", unicodedata.normalize("NFC", t))}
        return sorted(m for m in mots if m not in self.dico)
