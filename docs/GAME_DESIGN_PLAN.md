# 📜 Documento de Planejamento e Game Design (GDD): **Merchant Route**

> **Conceito Central (High Concept):** Um RPG tático e simulador de comércio pós-colapso em visão top-down (inspirado em *Caravaneer*, *Fallout 1/2* e *Mount & Blade*), onde cada bala disparada e cada litro de água ou gasolina consumido entram na ponta do lápis do seu lucro como mercador ambulante.

---

## 1. Ambientação e Ponto de Partida

### 1.1 O Mundo
A civilização industrial colapsou, deixando para trás uma terra árida e desolada. Água potável e comida limpa tornaram-se moedas de sobrevivência. Armas de fogo funcionais e munição intacta são relíquias disputadas a sangue, e a grande maioria da população regrediu ao transporte por tração animal (jumentos, mulas e cavalos puxando carroças improvisadas). Motores a combustão e gasolina refinada ainda existem, mas são monopólio de grandes assentamentos e barões locais.

### 1.2 A Herança do Avô (Inventário Inicial)
Você começa sua jornada em uma pequena vila fronteiriça após o funeral do seu avô, herdando tudo o que ele guardou na vida:
* **Transporte Inicial:** `1x Jumento Velho` (baixa velocidade, carrega até 80 kg sem precisar de carroça, consome pouca água e forragem).
* **Capital Inicial:** `$1.000` em notas antigas aceitas pelas guildas mercantes.
* **Equipamento de Combate:** `1x Rifle de Ferrolho Velho` + `12x Balas calibre .308` + `1x Facão Enferrujado` (para não gastar balas com pragas menores).
* **Suprimentos de Sobrevivência:** Água e ração para 3 dias de viagem.

---

## 2. Sistema de Atributos do Personagem (RPG)

Os atributos do protagonista impactam simultaneamente a **economia**, a **logística** e o **combate tático**:

| Atributo | Impacto no Combate Tático (Top-Down) | Impacto no Comércio e Mapa Aberto |
| :--- | :--- | :--- |
| **Vigor (FOR/VIG)** | Define os **Pontos de Vida (HP)** máximos (`50 + VIG * 10`), resistência a sangramento e dano corpo a corpo. | Aumenta a capacidade de carga pessoal (`+5 kg` por ponto) e reduz o consumo extra de água no calor. |
| **Agilidade (AGI)** | Define os **Action Points (AP)** por turno (`5 + floor(AGI / 2)`) e quantos **quadrados** o personagem move por AP. | Aumenta a chance de **Fuga** em encontros na estrada e a iniciativa do grupo. |
| **Percepção (PER)** | Aumenta a **Precisão (%)** de tiros a distância e o alcance ótimo das armas de fogo. | Revela emboscadas de bandidos mais longe no mapa aberto, permitindo desviar da rota antes do encontro. |
| **Carisma (CAR)** | Permite intimidar inimigos com moral baixa no meio da luta para forçar rendição/fuga. | Reduz preços de compra e aumenta preços de venda (`±2,5%` por ponto), melhora testes de blefe/suborno e barateia salários de mercenários. |

---

## 3. Logística, Transportes e Movimento no Mapa Aberto

### 3.1 Categorias de Transporte e Combinações
A velocidade da caravana no mapa aberto depende da **combinação entre tração (animal ou motor) e veículo (carroça/chassi)**, além da razão entre peso atual e peso máximo.

| Meio de Transporte | Carga Máx. | Velocidade Base | Consumo Parado | Consumo em Movimento | Terreno Ideal / Penalidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A Pé (Sem animal)** | 35 kg | 4,0 km/h | Água + Comida | Água + Comida | Passa em qualquer lugar, mas carga mínima |
| **Jumento (Herança)** | 80 kg | 5,5 km/h | Água + Forragem | Água + Forragem | Excelente em rochas e deserto |
| **Carroça Leve + Jumento** | 220 kg | 4,5 km/h | Água + Forragem | Água + Forragem | Lenta na areia; boa em estradas |
| **Carroça + Cavalo(s)** | 450 kg | 8,0 km/h | Água (alta) + Forragem | Água (alta) + Forragem | Rápida em estradas; cavalos exigem mais água |
| **Moto de Sucata** | 120 kg | 28,0 km/h | Zero (só o piloto) | **Gasolina** (1 L / 15 km) | Ideal para cargas raras/leves e fugas rápidas |
| **Caminhonete / Carro** | 1.200 kg | 38,0 km/h | Zero (só tripulação) | **Gasolina** (1 L / 5 km) | Domina rotas longas entre cidades grandes |

### 3.2 Mecânicas de Estrada
1. **Curva de Peso vs. Velocidade:**
   * Até 70% da capacidade máxima: Velocidade normal (100%).
   * Entre 71% e 100% da capacidade: Redução linear de velocidade até -30%.
   * Acima de 100% (Sobrecarga até 120%): Velocidade cai pela metade e o consumo de água/combustível sobe 50%.
2. **Alijamento de Carga (Jogar Carga Fora):**
   * Durante uma perseguição no mapa aberto, o jogador pode descartar mercadorias pesadas/baratas para recuperar velocidade imediatamente e escapar de saqueadores.
3. **Terrenos do Mapa-Múndi:**
   * **Estrada Antiga:** +25% de velocidade para rodas (carroças, motos e carros), mas maior frequência de bandidos.
   * **Deserto/Dunas:** -40% de velocidade para carroças pesadas; consumo de água +50%.
   * **Trilha Rochosa/Montanha:** Risco de avaria em rodas de carroça; jumentos mantêm 100% de eficiência.

---

## 4. Economia Dinâmica, Inflação e Rotas Comerciais

### 4.1 Especialização Regional de Cidades

| Cidade / Assentamento | Porte | Produz (Barato / Compra-se aqui) | Demanda Crítica (Caro / Vende-se aqui) | Serviços Exclusivos |
| :--- | :--- | :--- | :--- | :--- |
| **Vila Poeira** *(Início)* | Pequeno | Água de Poço, Forragem, Milho Seco | Couro, Ferramentas, Remédios | Estábulo básico (Jumentos e Carroças) |
| **Rancho Couro-Seco** | Pequeno | Couro Cru, Carne Seca, Cavalos | Água, Munição, Sal | Venda de Cavalos e Arreios |
| **Mina de Chumbo** | Médio | Sucata Metálica, Pólvora, Munição | Comida, Água, Álcool/Bebidas | Armeiro especializado |
| **Refinaria Sol Negro** | Médio | Gasolina, Óleo de Motor, Peças | Comida Fresca, Couro, Armas | Oficina de Motos e Carros |
| **Cidade-Cratera** | Grande | Armas, Remédios, Tecnologia, Gasolina | Tudo em grande volume (Materiais brutos) | Grande Mercado, Xerife Regional, Banco |

### 4.2 Cálculo de Preço Dinâmico
`Preço Final = Preço Base * Multiplicador da Cidade * Fator de Escassez Atual * (1 ± Bônus de Carisma)`

* **Saturação de Mercado:** Despejar grandes volumes de uma mesma mercadoria reduz o preço pago pela cidade até que o estoque local seja consumido.
* **Eventos de Inflação (Rumores do Saloon):** Crises temporárias (Seca Severa, Bloqueio de Saqueadores, Praga no Gado) multiplicam preços por 2x a 3x.
* **Contrabando:** Mercadorias ilegais rendem margens altíssimas, mas exigem passar pela inspeção do Xerife na entrada das cidades maiores.

---

## 5. Diálogos e NPCs das Cidades

1. **Vendedor de General Goods & Armas:** Compra e vende suprimentos, matérias-primas, armas e munição.
2. **Vendedor de Transporte (Estábulo / Oficina):** Negocia animais, carroças, motos, caminhonetes, melhorias de chassi, reparos e **Gasolina**.
3. **Xerife Local:** Oferece **Recompensas (Bounties)** por líderes de gangues (reduzindo o perigo das rotas comerciais ao serem eliminados) e fiscaliza contrabando.
4. **Barman & Saloon:** Vende rumores sobre inflação/crises nas outras cidades, oferece **Contratos de Frete** e permite contratar **Mercenários** (que lutam no seu grupo em troca de salário diário, água e comida).

---

## 6. Encontros e Combate Tático Top-Down (Action Points)

* **Janela Pré-Combate:** Opções de *Lutar*, *Fugir* (com opção de alijar carga), *Negociar Pedágio* ou *Intimidar* (teste de Carisma + Poder de Fogo).
* **Grid Tático Top-Down:**
  * Movimento em quadrados baseado em AP e terreno.
  * Cobertura parcial (-25%) e total (-50%) atrás de rochas, muros e da própria carroça da caravana.
  * Modos de Ataque: *Corpo a Corpo* (sem gastar balas), *Tiro Rápido* (menor custo de AP) e *Tiro Mirado* (maior custo de AP, +25% precisão e crítico).
  * Sistema de Moral (inimigos feridos ou sem líder podem fugir) e Saque pós-combate.

---

## 7. Arquitetura Técnica e Roadmap (`.exe` + Web)

* **Stack:** Next.js (React + TypeScript Estrito) + Tailwind CSS + Renderização 2D (HTML5 Canvas) + **Electron (`electron-builder`)** para geração do executável `.exe` nativo no Windows + Deploy na **Vercel** e persistência local/nuvem com **Supabase**.
* **Fases de Entrega:**
  1. **Fase 1 (MVP Economia & Estrada):** Ficha de atributos, herança do avô, mapa-múndi, cálculo de peso/velocidade/consumo e mercado com inflação regional.
  2. **Fase 2 (Combate Tático Top-Down):** Encontros na estrada, grid tático por turnos e AP, armas, cobertura e saque.
  3. **Fase 3 (Diálogos, NPCs, Bounties e Saloon):** Interações completas com Vendedores, Xerife, Contrabando, Rumores e Mercenários.
  4. **Fase 4 (Polimento & Executável `.exe`):** Balanceamento, efeitos visuais/sonoros e empacotamento final `.exe`.
