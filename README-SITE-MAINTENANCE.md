# Maintenance du Site GitHub Pages

Guide pour maintenir automatiquement le site GitHub Pages de LuminaFast à jour avec les dernières informations du projet.

---

## 🔄 Méthodes de Maintenance

### 1. Automatique (Recommandé)

#### GitHub Actions
Le site se met à jour automatiquement via GitHub Actions quand :

- **Push sur main/develop** avec modifications dans `Docs/`
- **Changement de version** dans `package.json` ou `src-tauri/Cargo.toml`
- **Mise à jour quotidienne** à 2h UTC pour les statistiques
- **Déclenchement manuel** via l'interface GitHub Actions

#### Fichier de configuration
`.github/workflows/update-site.yml` - Workflow complet qui :
- Récupère les dernières statistiques (tests, coverage, phases)
- Met à jour `_config.yml` avec les nouvelles valeurs
- Synchronise la documentation depuis `Docs/`
- Pousse les modifications sur la branche `gh-pages`

---

### 2. Manuel (Rapide)

#### Script de mise à jour
```bash
# Mettre à jour le site avec les dernières données
npm run site:update

# Mettre à jour et pousser immédiatement
npm run site:build
```

#### Script détaillé
```bash
# Exécuter le script manuellement
./scripts/update-site.sh
```

---

## 📊 Données Automatiquement Mises à Jour

### Statistiques du Projet
- **Nombre de tests** : Compté depuis `npm run test:ci`
- **Coverage** : Extrait des résultats de tests
- **Phases complétées** : Comptées depuis `CHANGELOG.md`
- **Version** : Lue depuis `package.json`

### Documentation
- **APP_DOCUMENTATION.md** → `documentation/app-documentation.md`
- **CHANGELOG.md** → `documentation/changelog.md`
- **Date de mise à jour** : Automatiquement ajoutée

### Progression
- **Barres de progression** dans toutes les pages
- **Pourcentages** calculés automatiquement
- **Roadmap** mise à jour avec les dernières phases

---

## 🛠️ Configuration

### Variables GitHub Actions
Le workflow utilise automatiquement :
- `GITHUB_TOKEN` : Pour les commits sur le repository
- `GITHUB_REPOSITORY` : Pour identifier le repo
- `GITHUB_REF` : Pour connaître la branche actuelle

### Fréquence de Mise à Jour
| Événement | Fréquence | Déclencheur |
|----------|-----------|------------|
| Push sur Docs | Immédiat | Modification fichiers |
| Changement version | Immédiat | package.json |
| Statistiques | Quotidien | Cron 2h UTC |
| Manuel | À demande | `workflow_dispatch` |

---

## 🔧 Personnalisation

### Ajouter de nouvelles statistiques
1. Modifier `.github/workflows/update-site.yml`
2. Ajouter les commandes d'extraction dans le job `stats`
3. Mettre à jour les fichiers cibles dans les étapes suivantes

### Modifier les fichiers synchronisés
1. Éditer la section `Update documentation from source`
2. Ajouter/retirer des fichiers `cp`
3. Ajouter des transformations `sed` si nécessaire

### Changer la fréquence
```yaml
# Dans .github/workflows/update-site.yml
schedule:
  - cron: '0 2 * * *'  # Tous les jours à 2h UTC
  # - cron: '0 */6 * * *'  # Toutes les 6 heures
  # - cron: '0 0 * * 1'  # Tous les lundis minuit
```

---

## 🚨 Dépannage

### Le workflow échoue
1. **Vérifier les permissions** : GitHub Actions doit pouvoir écrire sur `gh-pages`
2. **Vérifier les chemins** : Assurez-vous que les fichiers existent
3. **Vérifier les branches** : La branche `gh-pages` doit exister

### Les statistiques sont incorrectes
1. **Vérifier les tests** : `npm run test:ci` doit fonctionner
2. **Vérifier CHANGELOG** : Doit contenir les marqueurs "✅ Complétée"
3. **Vérifier la version** : Doit être valide dans `package.json`

### Le site ne se met pas à jour
1. **Vérifier GitHub Pages** : Doit être activé sur la branche `gh-pages`
2. **Vérifier le workflow** : Doit être activé dans les settings du repo
3. **Forcer la mise à jour** : Lancer manuellement le workflow

---

## 📋 Checklist de Maintenance

### Mensuelle
- [ ] Vérifier que les statistiques sont à jour
- [ ] Confirmer que la documentation est synchronisée
- [ ] Vérifier les liens internes fonctionnent
- [ ] Tester la navigation sur mobile

### Après chaque phase complétée
- [ ] Mettre à jour CHANGELOG.md
- [ ] Lancer `npm run site:update`
- [ ] Vérifier la progression sur le site
- [ ] Confirmer les nouvelles fonctionnalités sont documentées

### Avant une release
- [ ] Mettre à jour la version dans `package.json`
- [ ] Lancer `npm run site:build`
- [ ] Vérifier toutes les pages
- [ ] Tester tous les liens

---

## 🔗 Liens Utiles

- **Site GitHub Pages** : https://groovybronx.github.io/luminafast/
- **Workflow Actions** : https://github.com/groovybronx/luminafast/actions
- **Settings Pages** : https://github.com/groovybronx/luminafast/settings/pages
- **Branche gh-pages** : https://github.com/groovybronx/luminafast/tree/gh-pages

---

## 📞 Support

En cas de problème :
1. **Vérifier les logs** du workflow GitHub Actions
2. **Exécuter le script manuellement** pour identifier l'erreur
3. **Consulter ce guide** pour les solutions communes
4. **Ouvrir une issue** sur le repository si nécessaire

---

*Le site est conçu pour être maintenu avec un minimum d'effort tout en restant toujours à jour avec les dernières avancées du projet.*
