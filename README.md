# Corrector ortográfico para WhatsApp Web

Corrector de ortografía, gramática y puntuación al estilo de LanguageTool, pensado para usarse dentro de **WhatsApp Web**.

## Contenido

| Carpeta | Qué es |
|---|---|
| `extension/` | Extensión de Chrome/Edge (Manifest V3) que subraya los errores mientras escribes en WhatsApp Web y sugiere correcciones. |
| `servicio/` | Instalador que deja LanguageTool como **servicio de Windows** local (sin límites, los mensajes no salen del PC). |
| `web/` | Versión de página web del corrector (usa Claude para revisar el texto). |

## Cómo funciona

La extensión envía el texto a LanguageTool en este orden:

1. El servidor escrito en el campo **Servidor** del panel, si hay uno.
2. El servicio local `http://localhost:8010`, si está encendido.
3. El servicio público gratuito `https://api.languagetool.org` (máx. ~20 revisiones por minuto).

## Instalación

### 1. Servicio de Windows (opcional, recomendado)

1. Abre la carpeta `servicio`.
2. Clic derecho en **INSTALAR.bat** → *Ejecutar como administrador*.
3. Espera el mensaje **LISTO**. Si falta Java 17+, se instala con `winget`.

Queda en `C:\LanguageTool` como el servicio *LanguageTool (corrector local)*, con arranque automático.
Para quitarlo: **DESINSTALAR.bat** como administrador.

### 2. Extensión

1. Abre `chrome://extensions` (o `edge://extensions`).
2. Activa **Modo de desarrollador**.
3. **Cargar descomprimida** → elige la carpeta `extension`.
4. Recarga WhatsApp Web.

## Uso

- **Automático:** mientras escribes, las palabras con error se subrayan con una línea ondulada
  (rojo = ortografía, amarillo = gramática, morado = puntuación, azul = estilo).
- Pasa el mouse o haz clic sobre la palabra subrayada para ver las alternativas y corregirla con un clic.
  También puedes **Ignorar** o **Añadir al diccionario**.
- El ícono pequeño junto al cuadro de texto muestra cuántos errores hay. Al hacer clic (o `Alt+Shift+C`)
  abre la lista completa, con **Aplicar todas**, el idioma y la opción para desactivar la revisión automática.

## Tecnologías

- JavaScript (extensión Chrome MV3, Shadow DOM)
- [LanguageTool](https://github.com/languagetool-org/languagetool) (servidor HTTP, Java)
- PowerShell + [WinSW](https://github.com/winsw/winsw) para el servicio de Windows
