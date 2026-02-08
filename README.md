# Projeto 3D – Buraco Negro em WebGL

Este projeto consiste em uma **cena tridimensional interativa desenvolvida em WebGL**, que representa visualmente um **buraco negro**, inspirado em fenômenos astrofísicos reais.

O objetivo principal do projeto é **aplicar conceitos fundamentais de Computação Gráfica**, como pipeline gráfico, transformações geométricas, câmera 3D, projeção em perspectiva, iluminação, shaders e texturas, em uma aplicação executada em tempo real no navegador.

---

## Objetivo do Projeto

- Desenvolver uma cena 3D interativa utilizando WebGL
- Aplicar corretamente os conceitos estudados em Computação Gráfica
- Criar uma visualização imersiva do fenômeno de um buraco negro
- Permitir navegação em primeira pessoa pelo ambiente

> **Observação:** o projeto não tem como objetivo simular fisicamente um buraco negro, mas sim representar visualmente o fenômeno com foco em renderização gráfica.

---

## Tecnologias Utilizadas

- **WebGL / WebGL2**
- **JavaScript**
- **GLSL (Shaders)**
- **HTML5 Canvas**

---



## Como Executar o Projeto

### Opção 1 – Servidor Local (RECOMENDADO)

Por questões de segurança do navegador, o WebGL **não deve ser executado abrindo o arquivo HTML diretamente**.  
É necessário rodar o projeto em um **servidor local**.

#### Usando Python

Na pasta do projeto, execute:

```bash
# Python 3
python -m http.server

```

Depois, abra no navegador:

```bash
http://localhost:8000
```

### Opção 2 – Extensão Live Server (VS Code)

Abra o projeto no VS Code

Instale a extensão Live Server

Clique com o botão direito em **index.html**

Selecione "Open with Live Server"

### Controles

W / A / S / D → Movimentação da câmera

Mouse → Rotação da câmera (olhar ao redor)

Clique na tela → Ativar áudio ambiente

ESC → Liberar o mouse
