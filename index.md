---
layout: default
title: Accueil
description: Digital Asset Management moderne pour photographes
---

<!-- Features Section -->
<section class="py-20 bg-white">
  <div class="container mx-auto px-4 max-w-6xl">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-bold text-gray-900 mb-4">Fonctionnalités Principales</h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">
        Une architecture moderne inspirée des meilleures pratiques de l'industrie
      </p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Phase 0 -->
      <div class="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
          <i class="fas fa-cube text-green-600 text-xl"></i>
        </div>
        <h3 class="text-xl font-semibold mb-3 text-gray-900">Fondations Solides</h3>
        <p class="text-gray-600 mb-4">
          Architecture moderne avec TypeScript strict, Tauri v2, et pipeline CI/CD complet.
        </p>
        <div class="flex items-center text-green-600 font-medium">
          <i class="fas fa-check-circle mr-2"></i>
          Phase 0 complétée
        </div>
      </div>
      
      <!-- Phase 1 -->
      <div class="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
          <i class="fas fa-database text-blue-600 text-xl"></i>
        </div>
        <h3 class="text-xl font-semibold mb-3 text-gray-900">Data Layer</h3>
        <p class="text-gray-600 mb-4">
          SQLite optimisé, BLAKE3 pour déduplication, et service filesystem avancé.
        </p>
        <div class="flex items-center text-green-600 font-medium">
          <i class="fas fa-check-circle mr-2"></i>
          Phase 1 complétée
        </div>
      </div>
      
      <!-- Phase 2 -->
      <div class="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
          <i class="fas fa-download text-yellow-600 text-xl"></i>
        </div>
        <h3 class="text-xl font-semibold mb-3 text-gray-900">Pipeline d'Import</h3>
        <p class="text-gray-600 mb-4">
          Discovery de fichiers, ingestion parallèle, et harvesting EXIF/IPTC.
        </p>
        <div class="flex items-center text-yellow-600 font-medium">
          <i class="fas fa-spinner mr-2"></i>
          Phase 2 en cours
        </div>
      </div>
    </div>
    
    <div class="text-center mt-12">
      <a href="{{ '/features/roadmap.html' | relative_url }}" class="inline-flex items-center text-primary hover:underline font-medium">
        Voir la roadmap complète
        <i class="fas fa-arrow-right ml-2"></i>
      </a>
    </div>
  </div>
</section>

<!-- Architecture Section -->
<section class="py-20 bg-gray-50">
  <div class="container mx-auto px-4 max-w-6xl">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="text-4xl font-bold text-gray-900 mb-6">Architecture Moderne</h2>
        <p class="text-xl text-gray-600 mb-8">
          Construit avec les meilleures technologies 2024 pour performance et maintenabilité.
        </p>
        
        <div class="space-y-6">
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <i class="fas fa-layer-group text-white text-sm"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Frontend React 19</h3>
              <p class="text-gray-600">Interface utilisateur moderne avec TypeScript strict et state management Zustand.</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <i class="fas fa-window-maximize text-white text-sm"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Shell Natif Tauri v2</h3>
              <p class="text-gray-600">Performance native avec fenêtre desktop et accès système sécurisé.</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <i class="fas fa-cog text-white text-sm"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Backend Rust</h3>
              <p class="text-gray-600">Services haute performance avec concurrence async et gestion d'erreurs robuste.</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-4">
            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <i class="fas fa-database text-white text-sm"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Base de Données SQLite</h3>
              <p class="text-gray-600">Catalogue optimisé avec PRAGMA WAL, index stratégiques, et migrations automatiques.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">React 19.2.0</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">TypeScript (strict)</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">Tauri v2</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">Rust stable</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">SQLite + BLAKE3</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span class="font-medium">Zustand</span>
            <span class="text-green-600"><i class="fas fa-check"></i></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Stats Section -->
<section class="py-20 bg-primary text-white">
  <div class="container mx-auto px-4 max-w-6xl text-center">
    <h2 class="text-4xl font-bold mb-12">Statistiques du Projet</h2>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <div>
        <div class="text-5xl font-bold mb-2">{{ site.test_count }}</div>
        <div class="text-blue-100">Tests unitaires</div>
        <div class="text-sm text-blue-200 mt-2">100% passants</div>
      </div>
      
      <div>
        <div class="text-5xl font-bold mb-2">{{ site.test_coverage }}</div>
        <div class="text-blue-100">Coverage</div>
        <div class="text-sm text-blue-200 mt-2">Excellente qualité</div>
      </div>
      
      <div>
        <div class="text-5xl font-bold mb-2">{{ site.phases_completed }}</div>
        <div class="text-blue-100">Phases complétées</div>
        <div class="text-sm text-blue-200 mt-2">sur {{ site.total_phases }} totales</div>
      </div>
      
      <div>
        <div class="text-5xl font-bold mb-2">0</div>
        <div class="text-blue-100">Bugs critiques</div>
        <div class="text-sm text-blue-200 mt-2">Code robuste</div>
      </div>
    </div>
    
    <div class="mt-12">
      <a href="{{ '/stats/' | relative_url }}" class="inline-flex items-center bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
        <i class="fas fa-chart-bar mr-2"></i>
        Voir toutes les statistiques
      </a>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="py-20 bg-gray-50">
  <div class="container mx-auto px-4 max-w-6xl text-center">
    <h2 class="text-4xl font-bold text-gray-900 mb-6">Prêt à Commencer ?</h2>
    <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
      Rejoignez le projet et découvrez une nouvelle façon de gérer vos photographies.
    </p>
    
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="{{ '/installation/getting-started.html' | relative_url }}" class="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
        <i class="fas fa-download mr-2"></i>
        Installer maintenant
      </a>
      <a href="{{ '/installation/development-setup.html' | relative_url }}" class="inline-flex items-center justify-center px-8 py-3 bg-white text-primary border-2 border-primary font-semibold rounded-lg hover:bg-gray-50 transition-colors">
        <i class="fas fa-code mr-2"></i>
        Contribuer au code
      </a>
    </div>
  </div>
</section>
