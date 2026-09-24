# 🚀 Servidor OpenCode en Google Colab con CCUs de Google AI Pro

Esta guía te permite levantar **Qwen 2.5 Coder** o **DeepSeek Coder** en la infraestructura GPU de Google consumiendo tus **Compute Units (CCUs)** de Google AI Pro, y conectarlo a **Chefsy / Antigravity** mediante el servidor MCP.

---

### Pasos para iniciar (1 minuto):

1. **Abrir Google Colab:**
   * Entrá en [https://colab.research.google.com](https://colab.research.google.com).
   * En la ventana inicial, elegí la pestaña **Subir (Upload)** y seleccioná el archivo:
     `scripts/colab_opencode_server.ipynb` (o arrastralo desde esta carpeta).

2. **Asegurar la GPU:**
   * Andá al menú **Entorno de ejecución > Cambiar tipo de entorno de ejecución**.
   * En *Acelerador de hardware*, seleccioná **GPU** (T4, L4 o A100 según tus CCUs).

3. **Ejecutar:**
   * Hacé clic en **Entorno de ejecución > Ejecutar todas** (o `Ctrl + F9`).
   * La primera vez tardará ~2 minutos mientras descarga e inicializa el modelo en la VRAM de la GPU.

4. **Copiar la URL pública:**
   * Al final de la última celda verás un cartel verde con la URL del túnel, por ejemplo:
     `https://example-tunnel.trycloudflare.com`

5. **Vincularlo con Antigravity:**
   * Simplemente escribile en este chat:
     `Conectate al endpoint https://example-tunnel.trycloudflare.com`
   * ¡Listo! El servidor MCP `opencode` se conectará a la GPU de Google y estará disponible para generar o revisar código en cualquier momento.
