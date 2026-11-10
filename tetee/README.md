# 🤱 Tétée — suivi d'allaitement ultra simple

Appli web installable sur Android (PWA) : pas de Play Store, pas de compilation.

- **Tétée** : un tap sur **G** ou **D** démarre le chrono. Gros bouton **Pause** et **Reprendre**. Chaque action se fait en 1 tap ; démarrer, changer de sein, terminer ou noter une couche affiche 10 s un bandeau **Annuler** en cas d'erreur.
- Le dernier sein utilisé est marqué « dernier ». L'écran reste allumé pendant une tétée.
- **Biberon** (ml, lait maternel ou artificiel) et **Couche** (humide, sale, mixte ou explosion) en 2 taps.
- **Tirage** (ml à gauche et à droite), **Sommeil** (bouton Dodo / Réveil avec chrono) et **Croissance** (poids, taille, tour de tête, avec courbe de poids dans Stats).
- **Historique** : appuyer sur une ligne pour la modifier ou la supprimer. Les boutons « + » servent à ajouter un oubli.
- **Stats** : aujourd'hui, dernières 24 h, moyenne sur 7 jours, répartition G/D, intervalle moyen entre deux repas.
- **Mode une main** : les gros boutons sont en bas de l'écran, sous le pouce.
- **Mode nuit** : noir et rouge tamisé. Il s'active tout seul au coucher du soleil et s'arrête au lever, jamais avant 8 h (bouton 🌙 pour forcer). Il rend mieux dans Chrome que dans Firefox.
- **Hors ligne** : tout marche sans réseau, la synchro reprend toute seule.
- **Synchro en direct entre deux téléphones**, même pour une tétée en cours.

## Installer sur Android

1. Ouvrir `https://sachd-av.github.io/junior/tetee/` dans Chrome
   (il faut que GitHub Pages soit activé sur le dépôt : *Settings → Pages → Deploy from branch → main / root*).
2. Menu ⋮ → **Ajouter à l'écran d'accueil** (ou **Installer l'application**).

L'appli marche tout de suite, en local. Pour partager avec l'autre parent, il faut la synchro (une seule fois, environ 5 min, gratuit).

## Activer la synchro (une seule fois)

1. Aller sur <https://console.firebase.google.com> → **Créer un projet** (Google Analytics n'est pas utile).
2. **Créer → Firestore Database** → *Créer une base de données* → choisir une région (ex. `eur3`) → mode **production**.
3. Onglet **Règles** de Firestore : remplacer tout le contenu par celui du fichier [`firestore.rules`](firestore.rules), puis **Publier**.
   Ces règles valident chaque écriture et interdisent tout le reste.
4. ⚙ **Paramètres du projet** → *Vos applications* → icône **Web `</>`** → donner un nom → copier le bloc `const firebaseConfig = { … }`.
5. Dans l'appli : **Réglages → coller la configuration → Activer la synchro**.
6. **📤 Envoyer le lien à l'autre parent** (WhatsApp, SMS…). Il ouvre le lien dans Chrome sur son téléphone, installe l'appli, et c'est synchronisé.

Les données sont rangées sous un code famille aléatoire de 16 caractères, que seul le lien d'invitation contient. Ne partagez ce lien qu'avec l'autre parent.

**Conseillé (2 min) :** dans <https://console.cloud.google.com/apis/credentials> (même projet), ouvrez la clé *Browser key*,
puis choisissez *Restrictions relatives aux applications → Sites web* et ajoutez `https://sachd-av.github.io/*`.
La clé ne marchera alors que depuis l'appli.

Le détail de l'audit de sécurité est dans [SECURITE.md](SECURITE.md).

## Sauvegarde automatique sur Google Drive

Chaque nuit vers 3 h, un petit script Google (gratuit, dans votre propre compte) copie tout le suivi
dans le dossier Drive **Tétée – sauvegardes** : 7 copies quotidiennes, 8 hebdomadaires et 24 mensuelles.
Ça marche même téléphones éteints. Les fichiers se réimportent avec **Réglages → Importer**.

À installer une fois, de préférence sur ordinateur :
1. Dans l'appli : **Réglages → Sauvegarde automatique Google Drive → Copier le script**
   (ou **M'envoyer le script** pour le recevoir par mail ou message).
2. Ouvrir <https://script.google.com> → **Nouveau projet** → effacer le contenu → coller le script.
3. Cliquer sur 💾 **Enregistrer**. En haut, choisir la fonction **installer**, puis **Exécuter**.
4. Google demande l'autorisation : **Examiner les autorisations** → votre compte.
   S'il affiche « Google n'a pas validé cette application » : **Paramètres avancés → Accéder à … (non sécurisé)**.
   C'est normal, c'est votre propre script. Il ne peut lire que les données du suivi et écrire dans votre Drive.
5. Vérifier dans Google Drive que le dossier **Tétée – sauvegardes** est apparu.

Le script contient le code d'accès au suivi : ne le partagez pas.

## Est-ce que ça reste gratuit ?

Oui, sans carte bancaire :

- **GitHub Pages** (l'hébergement de l'appli) est gratuit pour un dépôt public.
- **Firebase, formule Spark** (gratuite) : 50 000 lectures, 20 000 écritures par jour et 1 Go de stockage.
  Après la première synchro, l'appli ne télécharge que les entrées récentes. Une famille en utilise
  quelques centaines par jour au maximum, et une année de suivi pèse moins de 5 Mo.

À faire :
- **Ne passez pas à la formule Blaze** (paiement à l'usage). Firebase la propose parfois : elle est inutile ici.
  Si le quota gratuit était un jour dépassé, la synchro s'arrêterait jusqu'au lendemain, sans aucun frais,
  et l'appli continuerait de marcher en local.
- **Gardez le dépôt GitHub public.** GitHub Pages n'est gratuit que pour les dépôts publics.
  Les données du bébé ne sont pas dans le dépôt, elles sont dans Firebase.
- Exportez une sauvegarde de temps en temps (**Réglages → ⬇ Exporter**).
