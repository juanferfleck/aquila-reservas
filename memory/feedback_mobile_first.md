---
name: feedback-mobile-first
description: El usuario quiere que todas las webapps de este proyecto sean mobile-first
metadata:
  type: feedback
---

Diseñar siempre mobile-first: layouts de una columna base, padding generoso en pantallas chicas, tap targets de mínimo 44px, tipografías legibles sin zoom, y solo ampliar a grid/columnas múltiples con sm: o md: breakpoints.

**Why:** El usuario lo indicó explícitamente para el proyecto reservaClasePrueba (Aquila Evolución).

**How to apply:** En cualquier componente o página de este proyecto, arrancar el CSS desde móvil y agregar breakpoints como excepción, no como base. Verificar que la UX sea usable con el pulgar en pantallas de 375px.
