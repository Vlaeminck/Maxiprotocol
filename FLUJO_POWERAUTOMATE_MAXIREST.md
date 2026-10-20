# 🤖 Flujo Oficial de Power Automate Desktop — Extracción Automática Maxirest POS

Este flujo de **Microsoft Power Automate Desktop** automatiza la secuencia exacta para interactuar con Maxirest POS con tus credenciales (**`ADMTOM` / `ADMTOM1`**), abrir la ventana **"Informes de ventas"**, seleccionar el informe de **Formas de Cobro** (y Conceptos/Cubiertos) y emitirlo por **Pantalla** para que Maxirest vuelque los archivos DBF a disco.

---

## 📋 Secuencia de Acciones del Flujo

1. Activar / Iniciar Maxirest POS (`C:\MaxiREST_SQL\MAXIREST.EXE`).
2. Login con `ADMTOM` y `ADMTOM1` (si pide credenciales).
3. Atajo de teclado: `Alt + I` seguido de `V` ➔ Abre **"Informes de ventas"**.
4. Selecciona **"Ventas por formas de cobro"**.
5. Salida por **Pantalla** (Monitor azul o tecla `Enter`).
6. Cierre de previsualización (`ESC`).
7. Selecciona **"Ventas por día (por concepto)"** ➔ Pantalla (para volcar cubiertos `CUB`).
8. Cierre de previsualización (`ESC`).
9. Cierre con botón **Salir** (`Alt + S`).

---

## 💻 Código Nativo para Pegar en Power Automate Desktop

> **Instrucciones:**  
> 1. Abre **Power Automate Desktop**.  
> 2. Crea un **"Nuevo flujo"** con el nombre `MaxiProtocol_Extraccion`.  
> 3. En el lienzo en blanco, presiona **`Ctrl + V`** pegando el código de abajo:

```robin
# 1. Comprobar si Maxirest POS ya está en ejecución
If (Process.ProcessRunning ProcessName: $'''MAXIREST''') Then
    UIAutomation.FocusWindow.FocusWindowByTitle WindowTitle: $'''*MaxiREST*'''
Else
    System.RunApplication.RunApplication ApplicationPath: $'''C:\\MaxiREST_SQL\\MAXIREST.EXE''' WorkingDirectory: $'''C:\\MaxiREST_SQL''' WindowStyle: System.ProcessWindowStyle.Normal ProcessId=> ProcessId
    Wait 4
    MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''ADMTOM{Tab}ADMTOM1{Enter}''' DelayBetweenKeystrokes: 100
    Wait 3
End

# 2. Navegar al menú Informes ➔ Ventas
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''%{i}v''' DelayBetweenKeystrokes: 150
Wait 2

# 3. Enfocar ventana 'Informes de ventas'
UIAutomation.FocusWindow.FocusWindowByTitle WindowTitle: $'''*Informes de ventas*'''
Wait 1

# 4. Seleccionar 'Ventas por formas de cobro'
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''Ventas por formas de cobro''' DelayBetweenKeystrokes: 50
Wait 1

# 5. Salida por Pantalla (Enter sobre monitor azul)
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Enter}''' DelayBetweenKeystrokes: 100
Wait 3

# 6. Maxirest vuelca bakinforme.dbf a disco. Cerrar previsualización
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Escape}''' DelayBetweenKeystrokes: 100
Wait 1

# 7. (Cubiertos): Seleccionar 'Ventas por día (por concepto)' y emitir
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''Ventas por día (por concepto){Enter}''' DelayBetweenKeystrokes: 80
Wait 3
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Escape}''' DelayBetweenKeystrokes: 100
Wait 1

# 8. Cerrar ventana con botón Salir
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''%{s}''' DelayBetweenKeystrokes: 100
Wait 1

Display.ShowMessage Title: $'''MaxiProtocol''' Message: $'''Extracción de informes de Maxirest completada con éxito. Tablas DBF sincronizadas.''' Icon: Display.Icon.Information Buttons: Display.Buttons.OK DefaultButton: Display.DefaultButton.Button1 IsTopMost: False
```
