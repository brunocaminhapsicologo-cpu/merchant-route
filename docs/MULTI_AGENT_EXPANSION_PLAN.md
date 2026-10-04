# 🛠️ Plano de Implementação Multi-Agente (Estética & Expansão *Caravaneer*)

Este documento estrutura a execução autônoma em etapas por uma equipe de subagentes especializados, com verificação obrigatória do Agente Orquestrador (`npm test`, `npm run lint` e `npm run build`) ao final de cada etapa antes de avançar para a seguinte.

---

## 👥 Equipe de Subagentes Especializados

1. **`arsenal-logistics-expander` (Especialista em Armas, Munições, Animais e Veículos)**
   * Expande o catálogo de armas (14+ armas entre brancas, revólveres, pistolas, rifles de ferrolho, carabinas lever-action, escopetas, submetralhadoras e rifles de precisão), 7 calibres de munição (`.22 LR`, `.38 Special`, `9mm`, `12-Gauge`, `.308 Win`, `5.56 NATO`, `7.62mm`), animais de carga (*Donkey*, *Mule*, *Draft Horse*, *Brahmin Ox*), carroças (*Handcart*, *Donkey Cart*, *Prairie Wagon*, *Ironclad Stagecoach*) e veículos a gasolina (*Scrambler Bike*, *Dune Buggy*, *V8 Cargo Truck*, *6x6 Diesel War Rig*), além de novas cidades (*Tombstone Crossing* e *New Chicago*).
2. **`caravaneer-texture-artist` (Artista de Texturas, Sprites Top-Down & UI *Caravaneer*)**
   * Cria texturas procedurais em SVG/Canvas com a estética árida, sépia, ferrugem e couro desgastado de *Caravaneer*: sprites vistos de cima para unidades, carroças, animais, veículos, cobertura (pedras, barricadas, ruínas, dunas), retratos de NPCs e silhuetas detalhadas de armas e veículos.
3. **`wasteland-sound-designer` (Engenheiro de Áudio Procedural Web Audio API)**
   * Constrói um sintetizador de efeitos sonoros e ambiência 100% nativo (sem dependência de arquivos externos quebrados) para disparos específicos por calibre (revólver, rifle pesado, escopeta, rajada automática), golpe de facão, recarga metálica, passos na areia, moedas no mercado, motor V8, vento do deserto e alertas de emboscada.
4. **`tactical-combat-animator` (Especialista em Mecânicas de Combate Top-Down & Animações)**
   * Implementa mira por partes do corpo estilo *Caravaneer* / *Fallout* (**Torso Snap**, **Torso Aimed**, **Headshot Crítico 2x**, **Tiros nas Pernas para reduzir AP/Movimento**), postura **Agachado (Crouch +15% Defesa)**, animações de traçantes de bala, clarão de disparo (*muzzle flash*), textos flutuantes de dano/erro (`-34 CRIT!`, `MISS`) e partículas de impacto no grid top-down.

---

## 📋 Etapas de Execução e Portões de Qualidade (Quality Gates)

* **Etapa 1:** Expansão de Domínio (Armas, Calibres, Animais, Carroças, Veículos, Cidades e Economia) $\rightarrow$ *Gate 1: Validação de Tipos e Testes Unitários*.
* **Etapa 2:** Geração dos Assets de Textura/Sprites (*Caravaneer* Aesthetic) e Motor de Áudio Procedural $\rightarrow$ *Gate 2: Verificação de Compilação e Integração de Assets*.
* **Etapa 3:** Upgrade do Combate Tático Top-Down (Mira por Parte do Corpo, Posturas, Animações de Tiro/Dano e Texturas no Mapa/Grid) $\rightarrow$ *Gate 3: Testes Automatizados Expandidos + Build Completo*.
* **Etapa 4:** Integração Final na UI, Compilação do `MerchantRoute.exe`, Merge para `main` e Deploy Produção na Vercel $\rightarrow$ *Gate 4: Status READY na Vercel*.
