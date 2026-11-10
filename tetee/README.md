# 🤱 Tétée — suivi d'allaitement ultra simple

Appli web installable sur Android (PWA) : pas de Play Store, pas de compilation.

- **Tétée** : un tap sur **G** ou **D** démarre le chrono. Un tap sur l'autre sein change de côté. **⏸ Pause rot**, **▶ Reprendre**, **✓ Terminer**.
- Le dernier sein utilisé est marqué « dernier ». L'écran reste allumé pendant une tétée.
- **Biberon** (ml, lait maternel ou artificiel) et **Couche** (pipi / caca) en 2 taps.
- **Historique** : appuyer sur une ligne pour la modifier ou la supprimer. Les boutons « + » servent à ajouter un oubli.
- **Stats** : aujourd'hui, dernières 24 h, moyenne sur 7 jours, répartition G/D, intervalle moyen entre deux repas.
- **Mode une main** : les gros boutons sont en bas de l'écran, sous le pouce.
- **Mode nuit** : noir et rouge tamisé. Il s'active tout seul de 21 h à 7 h (bouton 🌙 pour forcer).
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
3. Onglet **Règles** de Firestore, coller puis **Publier** :

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /families/{fam}/events/{id} {
         allow read, write: if fam.size() >= 9;
       }
     }
   }
   ```

4. ⚙ **Paramètres du projet** → *Vos applications* → icône **Web `</>`** → donner un nom → copier le bloc `const firebaseConfig = { … }`.
5. Dans l'appli : **Réglages → coller la configuration → Activer la synchro**.
6. **📤 Envoyer le lien à l'autre parent** (WhatsApp, SMS…). Il ouvre le lien dans Chrome sur son téléphone, installe l'appli, et c'est synchronisé.

Les données sont rangées sous un code famille aléatoire, que seul le lien d'invitation contient. Ne partagez ce lien qu'avec l'autre parent.
