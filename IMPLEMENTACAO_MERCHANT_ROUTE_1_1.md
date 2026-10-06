# Merchant Route 1.1 — implementação e validação

5 de outubro de 2026. Base: `main`, commit `874f106bfbe6dbd11ed735e29cd427f4d798d4d0`.

## Fluxo entregue

Atlas mundial → medição de rumo/distância → viagem local por bússola → parada perto de uma cidade → entrada pelo portão → mapa da cidade visto de cima → loja com interior/NPC → comércio e preparação → viagem/encontro → combate → retorno à viagem.

A medição do atlas não altera a direção. O jogador insere o rumo, onde 0° é norte, 90° leste, 180° sul e 270° oeste. Pode parar, mudar o rumo e acampar. O mapa local acompanha a posição. Cidades interceptadas pausam o movimento; sua entrada exige ação explícita.

## Implementado

- Movimento interpolado dos personagens entre casas, mantendo cada unidade em uma camada estável.
- Reação leve ao impacto, flash e dano; suporte a movimento reduzido.
- Turno inimigo apresentado por ações sequenciais, com movimentos, consumo de AP, tiros e reserva finita de munição. Recarregar durante esse turno retoma as ações restantes.
- Cenário contínuo no combate, sprites maiores, seleção/confirmação de alvo e prévia por foco/teclado. Ruínas intermediárias bloqueiam tiros e cobertura pode ser flanqueada.
- Mapas de cidade com loja geral, depósito, xerife, saloon, clínica, poço e portão. Cada loja tem interior visual e NPC. Contratação respeita a cidade de origem.
- Telas separadas de atlas, deslocamento/bússola, cidade/lojas e caravana/carga.
- Navegação livre com distância espacial e consumo proporcional de combustível e suprimentos. Sem combustível o transporte motorizado para.
- Relógio comum para viagem, descanso e salários; crises expiram e mercados recuperam estoques. Serviços urbanos exigem presença na cidade.
- Composição simples de caravana com configurações possuídas: capacidade e consumo agregados; velocidade limitada pela unidade mais lenta. Cada configuração pode ser ativada uma vez.
- Carregadores persistentes por arma, reserva separada e recarga parcial sem criação de balas. Estado das escoltas sobreviventes passa para o save.
- Registro de transações, custo médio de aquisição, margem comercial e despesas registradas de suprimentos/salários/clínica. Investimentos em transportes ficam separados. Bens herdados têm custo de aquisição registrado igual a zero.
- Contratos de recompensa aceitos na cidade e encontrados na estrada; conclusão reduz a chance de encontros na região associada e concede progressão.
- Save v3 com normalização, migração da viagem antiga, importação/exportação e backup de save ilegível/importado. Falha no backup bloqueia autosave.
- Efeitos e ambiência com volumes separados, mute persistente e suspensão ao ocultar a página.
- Exportação estática e empacotamento Windows portátil com runtime e arquivos locais. Não depende de Node instalado nem da URL publicada para jogar.

## Evidência

- 42 testes passaram em cinco arquivos, incluindo 16 regressões produzidas pela revisão independente.
- Verificação de tipos e compilação/exportação passaram.
- Navegador local: compra mudou dinheiro/estoque/inventário; rumo de 90° deslocou para leste; encontro interrompeu viagem; combate transferiu cinco balas da reserva; movimento gastou AP; tiro reduziu HP e carregador; ruína bloqueou linha de visão; recarga de página durante turno inimigo voltou ao jogador no próximo round.
- Nenhum erro de console apareceu na inspeção realizada.
- O teste interno do executável verifica serviço de HTML/JavaScript pelo endereço local. Isso não substitui jogar uma campanha no Windows ou inspecionar sua janela nativa.

## Uso

Abra `MerchantRoute.exe`. Para código: `npm ci`, `npm run dev`; para web exportada: `npm run build` e `npm start`. `npm run package:win` recompila e produz o pacote portátil em `release-final/`.

O `.exe` anterior é preservado em `desktop/MerchantRoute-WebLauncher-original.exe`. Saves da versão web antiga ou do servidor de desenvolvimento podem ser exportados/importados; origens diferentes do navegador mantêm armazenamento separado.

## Limites e próximas expansões

Esta entrega constrói o fluxo integrado e corrige seus fundamentos. A campanha ainda precisa de sessões de balanceamento e escuta de áudio. A arte usa SVG/Canvas próprios e reutiliza os assets do projeto; não há produção final de animações desenhadas quadro a quadro, identidades individuais para todos os NPCs ou trilha musical gravada.

O mapa de combate tem terreno e apresentação variados, mas a geometria continua com uma implantação determinística. Movimento tático é uma casa por comando. Composição de caravana não simula ainda passageiros, peças danificadas, oficinas, manutenção ou múltiplas cópias de uma mesma configuração.

Caravanas/patrulhas móveis visíveis, descoberta de regiões, caminhos táticos longos, cadeia narrativa de entregas, identidades visuais individuais e testes prolongados de campanha permanecem expansões do plano. Nenhuma publicação ou alteração remota foi feita.
