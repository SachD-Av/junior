# Audit de sécurité — appli Tétée

Date : 10 novembre 2026. Fichiers audités : `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, règles Firestore.

## Ce que l'appli manipule

- Des données de suivi du bébé (heures, durées, ml, couches, notes), stockées dans le navigateur (`localStorage`), et dans Firestore si la synchro est activée.
- La configuration Firebase et un **code famille** secret, qui ne sont transmis que par le lien d'invitation.
- Pas de compte, pas de mot de passe, pas de paiement, pas de traqueur ni de publicité.

## Failles trouvées et corrigées

| # | Gravité | Problème | Correction | Vérifié par |
|---|---------|----------|------------|-------------|
| 1 | **Élevée** | **Injection de code (XSS)** : les champs `ml` et `id` étaient insérés tels quels dans la page. Une entrée piégée, venant de la synchro, d'un import JSON ou d'un lien d'invitation malveillant, exécutait du JavaScript dans l'appli. | Toute donnée entrante passe par `clean()` : types stricts, `id` limité à `[A-Za-z0-9_-]`, `ml` numérique, textes bornés et échappés. | Test d'attaque : le code s'exécutait avant le correctif, il est bloqué après. |
| 2 | **Élevée** | **Règles Firestore trop larges** : n'importe qui ayant la config pouvait écrire n'importe quel document, de n'importe quelle taille, et supprimer des données. | Nouveau [`firestore.rules`](firestore.rules) : seul le chemin `families/<code>/events/<id>` est accessible, le format du code est vérifié, les champs, types et tailles sont validés, la suppression est interdite (l'appli marque les entrées supprimées sans les effacer). | 16 tests dans l'émulateur Firebase officiel, tous réussis. |
| 3 | Moyenne | **Lien d'invitation piégé** : un lien pouvait diriger l'appli vers le projet Firebase d'un inconnu, et toutes les données locales y étaient envoyées. Le code famille n'était pas validé (risque de chemin `../`). | La confirmation affiche le nom du projet Firebase et prévient que les données seront envoyées. Le code famille (`^[a-z0-9]{9,32}$`), le `projectId` et les clés de config sont validés. | Test : les liens invalides ou piégés sont refusés. |
| 4 | Moyenne | **Pas de défense en profondeur** contre l'injection. | Le JavaScript est déplacé dans `app.js`, et une politique CSP est ajoutée : scripts seulement depuis le site et `www.gstatic.com` (SDK Firebase), connexions seulement vers Firestore. Aucun script en ligne, `object-src 'none'`, `base-uri 'none'`, `no-referrer`. | Test : l'appli et le chargement du SDK Firebase marchent, sans violation CSP. |
| 5 | Faible | **Code famille court** (9 caractères, ~44 bits) avec un petit biais statistique. | Nouveaux codes de 16 caractères (80 bits), tirés sans biais avec `crypto.getRandomValues`. Les anciens codes restent acceptés. | Relecture du code. |
| 6 | Faible | **Plantage** de l'accueil si une tétée enregistrée avait 0 min des deux côtés. | Le cas « aucun segment » est géré. | Test. |

## Risques restants (acceptés, ou à faire de votre côté)

- **Le lien d'invitation est la clé d'accès.** Toute personne qui l'a peut lire et modifier le suivi. Ne l'envoyez qu'à l'autre parent. S'il fuit : *Réglages → Arrêter la synchro*, puis réactivez-la pour générer un nouveau code.
- **La clé API Firebase n'est pas un secret** (c'est le fonctionnement normal de Firebase). La restreindre au site ne protège pas Firestore : le SDK Firestore ne l'envoie pas et l'API REST fonctionne sans. La protection repose sur les règles et le code famille.
- **Origine partagée** : l'appli est servie sur `sachd-av.github.io`, comme l'appli « prénoms » du même dépôt ; le stockage du navigateur est commun aux deux. Toute faille d'injection dans l'une exposerait le code famille. La faille relevée dans l'appli prénoms (nom du partenaire affiché sans échappement) est corrigée ; l'idéal reste une adresse dédiée à Tétée.
- **Pas de comptes utilisateurs.** C'est un choix de simplicité. La sécurité repose sur le code de 80 bits, impossible à deviner. On peut ajouter plus tard Firebase Auth et Firebase App Check.
- **SDK Firebase chargé depuis `www.gstatic.com` sans contrôle d'intégrité (SRI)**, car les imports dynamiques ne le permettent pas. Le risque est très faible (CDN officiel de Google, version figée `10.12.2`).
- **Script de sauvegarde Google Drive** : il contient le code famille et tourne dans votre compte Google. Il lit Firestore en lecture seule par l'API REST publique (les règles exigent le code), et n'écrit que dans le dossier Drive « Tétée – sauvegardes ». Ne le partagez pas.
- **Rappels ntfy** : les notifications passent par le service public ntfy.sh, sur un canal dont le nom est dérivé du code famille (SHA-256, 96 bits) et donc impossible à deviner. Le message ne contient que l'heure du dernier repas. Quiconque connaît le nom du canal peut lire ces notifications : ne le partagez pas.
- **Données en clair sur le téléphone** (`localStorage`) : protégées par le verrouillage du téléphone.
- **GitHub Pages ne permet pas les en-têtes HTTP** : la CSP est en `<meta>`, donc `frame-ancestors` (anti-clickjacking) n'est pas applicable. Risque faible : l'appli n'a pas d'action sensible en un clic.

## Revue de code indépendante (11 novembre 2026)

Corrigé à la suite de la revue :
- appli prénoms : nom du partenaire et messages d'erreur échappés ;
- réglages du stockage revalidés au démarrage (listes blanches, configuration Firebase contrôlée comme à l'invitation) ;
- synchro incrémentale fondée sur la dernière modification **reçue du serveur** (et non sur les saisies locales), bouton « Tout resynchroniser » ;
- règles : une modification doit être plus récente que la version enregistrée ; horodatage borné (10 min d'avance au plus) ; l'appli récupère la version du serveur quand elle est plus récente ;
- import seulement après la synchro complète, sans écraser le serveur ;
- deux tétées ouvertes en même temps : la plus ancienne est fermée automatiquement ;
- nouvel essai de connexion si le réseau manquait ; plus de double connexion ;
- verrou d'écran sans fuite ; stats justes au changement d'heure ; sommeil coupé aux bornes de la période ;
- modifier les minutes d'une tétée garde le dernier sein en dernier ;
- tirage jusqu'à 4 000 ml au total ;
- CSP limitée au SDK Firebase 10.12.2 ; service worker « réseau d'abord » pour le code (les corrections s'appliquent dès l'ouverture) ;
- script Google : fuseau Europe/Paris forcé, 40 entrées lues, rappel de nuit reporté à 7 h, corbeille ignorée dans la rotation des sauvegardes.
