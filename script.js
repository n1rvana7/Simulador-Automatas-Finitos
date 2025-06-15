const canvas = document.getElementById('canvas');
const menu = document.getElementById('contextMenu');
const botonesModo = document.querySelectorAll(".btn-modo");

let estados = [];
let transiciones = [];
let estadoId = 0;
let idsLibres = []; // 🆕 IDs eliminados para reutilizar
let inicial = null;
let seleccionandoDesde = null;
let modo = '';
let nodoActual = null;
let lineaTemporal = null;
let simulacionCadena = "";
let simulacionPos = 0;
let simulacionEstado = null;
let simulacionEnCurso = false;


function cambiarModo(nuevoModo) {
  modo = nuevoModo;
  seleccionandoDesde = null;
  botonesModo.forEach(btn => btn.classList.remove("ring", "ring-offset-2", "ring-blue-400"));
  const index = { agregar: 0, enlazar: 1, '': 2 }[nuevoModo];
  if (index !== undefined) {
    botonesModo[index].classList.add("ring", "ring-offset-2", "ring-blue-400");
  }
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (modo === 'agregar') crearEstado(x, y);
});

document.addEventListener('click', () => {
  menu.style.display = 'none';
});

function crearEstado(x, y) {
  const idNum = idsLibres.length > 0 ? idsLibres.shift() : estadoId++;
  const id = "q" + idNum;
  const estado = { id, x, y, final: false, inicial: false };
  estados.push(estado);

  const grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
  grupo.setAttribute("transform", `translate(${x}, ${y})`);
  grupo.dataset.id = id;

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", 25);
  circle.setAttribute("fill", "#60a5fa");
  circle.setAttribute("stroke", "#1e3a8a");
  circle.setAttribute("stroke-width", 2);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dy", "0.3em");
  text.setAttribute("fill", "white");
  text.textContent = id;

  grupo.appendChild(circle);
  grupo.appendChild(text);
  canvas.appendChild(grupo);

  // Drag & drop
  let offsetX, offsetY;
  grupo.addEventListener('mousedown', (e) => {
    if (modo === 'enlazar') return;
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    offsetX = e.clientX - rect.left - estado.x;
    offsetY = e.clientY - rect.top - estado.y;

    function onMouseMove(e) {
      estado.x = e.clientX - rect.left - offsetX;
      estado.y = e.clientY - rect.top - offsetY;
      grupo.setAttribute("transform", `translate(${estado.x}, ${estado.y})`);
      actualizarTransiciones();
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // Enlazar nodos
  grupo.addEventListener('mousedown', (e) => {
    if (modo !== 'enlazar' || e.button !== 0) return;
    e.stopPropagation();
    seleccionandoDesde = estado;

    lineaTemporal = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineaTemporal.setAttribute("stroke", "#888");
    lineaTemporal.setAttribute("stroke-width", 2);
    lineaTemporal.setAttribute("stroke-dasharray", "4");
    canvas.appendChild(lineaTemporal);

    const updateLinea = (ev) => {
      const rect = canvas.getBoundingClientRect();
      lineaTemporal.setAttribute("x1", seleccionandoDesde.x);
      lineaTemporal.setAttribute("y1", seleccionandoDesde.y);
      lineaTemporal.setAttribute("x2", ev.clientX - rect.left);
      lineaTemporal.setAttribute("y2", ev.clientY - rect.top);
    };

    const onMouseUp = (ev) => {
      document.removeEventListener("mousemove", updateLinea);
      document.removeEventListener("mouseup", onMouseUp);

      if (lineaTemporal) {
        lineaTemporal.remove();
        lineaTemporal = null;
      }

      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const grupoDestino = target.closest("g");
      if (grupoDestino) {
        const destino = estados.find(e => e.id === grupoDestino.dataset.id);
        const simboloInput = prompt(`Símbolo para la transición de ${seleccionandoDesde.id} a ${destino.id}:`);
        const simbolo = simboloInput === null ? null : simboloInput.trim() || "λ";
        if (simbolo !== null) crearTransicion(seleccionandoDesde, destino, simbolo);
      }

      seleccionandoDesde = null;
    };

    document.addEventListener("mousemove", updateLinea);
    document.addEventListener("mouseup", onMouseUp);
  });

  // Menú contextual
  grupo.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    nodoActual = estado;
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.style.display = 'block';
  });
}

document.getElementById('marcarInicial').onclick = () => {
  if (inicial) inicial.inicial = false;
  nodoActual.inicial = true;
  inicial = nodoActual;
  actualizarColores();
  menu.style.display = 'none';
};

document.getElementById('marcarFinal').onclick = () => {
  nodoActual.final = !nodoActual.final;
  actualizarColores();
  menu.style.display = 'none';
};

document.getElementById('eliminarEstado').onclick = () => {
  const id = nodoActual.id;

  // Eliminar el estado del array
  estados = estados.filter(e => e.id !== id);

  // Filtrar y eliminar visualmente transiciones conectadas al estado eliminado
  const transicionesRestantes = [];
  transiciones.forEach(t => {
    if (t.origen.id === id || t.destino.id === id) {
      if (t.linea) t.linea.remove();  // por si quedan antiguas
      if (t.path) t.path.remove();    // nueva forma con curva
      if (t.texto) t.texto.remove();
    } else {
      transicionesRestantes.push(t);
    }
  });
  transiciones = transicionesRestantes;

  // Eliminar el grupo visual del nodo
  Array.from(canvas.querySelectorAll("g")).forEach(g => {
    if (g.dataset.id === id) g.remove();
  });

  // Resetear estadoId e inicial si no quedan nodos
  if (estados.length === 0) {
    estadoId = 0;
    inicial = null;
  }

  menu.style.display = 'none';
};


function crearTransicion(origen, destino, simbolo) {
  // Buscar si ya existe una transición entre esos dos nodos
  const transicionExistente = transiciones.find(t => t.origen === origen && t.destino === destino);

  if (transicionExistente) {
    // Agregar símbolo si no está repetido
    if (!transicionExistente.simbolo.split(',').includes(simbolo)) {
      transicionExistente.simbolo += "," + simbolo;
      transicionExistente.texto.textContent = transicionExistente.simbolo;
    }
    return;
  }

  // Crear nueva curva con texto
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("stroke", "#333");
  path.setAttribute("stroke-width", 2);
  path.setAttribute("fill", "none");
  canvas.insertBefore(path, canvas.firstChild);

  const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
  texto.setAttribute("text-anchor", "middle");
  texto.setAttribute("fill", "black");
  texto.textContent = simbolo;
  canvas.appendChild(texto);

  transiciones.push({ origen, destino, simbolo, path, texto });
  actualizarTransiciones();
}


function actualizarTransiciones() {
  for (let t of transiciones) {
    const { origen, destino, path, texto } = t;

    if (origen === destino) {
     
      const x = origen.x;
      const y = origen.y;
      const r = 25;

      // Control points para la curva encima del nodo
      const c1x = x - 30;
      const c1y = y - 60;
      const c2x = x + 30;
      const c2y = y - 60;

      const d = `M ${x} ${y - r}
                 C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x} ${y - r}`;
      path.setAttribute("d", d);

      texto.setAttribute("x", x);
      texto.setAttribute("y", y - r - 50);
    } else {
      // 🔁 Transición entre dos estados distintos
      const dx = destino.x - origen.x;
      const dy = destino.y - origen.y;
      const dist = Math.hypot(dx, dy);
      const offset = 40;

      const mx = (origen.x + destino.x) / 2;
      const my = (origen.y + destino.y) / 2;
      const nx = -dy / dist;
      const ny = dx / dist;

      const cx = mx + nx * offset;
      const cy = my + ny * offset;

      const d = `M ${origen.x} ${origen.y} Q ${cx} ${cy} ${destino.x} ${destino.y}`;
      path.setAttribute("d", d);

      texto.setAttribute("x", cx);
      texto.setAttribute("y", cy - 5);
    }
  }
}


function actualizarColores() {
  estados.forEach(est => {
    const g = Array.from(canvas.querySelectorAll("g")).find(e => e.dataset.id === est.id);
    const circle = g.querySelector("circle");
    if (est.inicial) {
      circle.setAttribute("stroke", "#22c55e");
    } else if (est.final) {
      circle.setAttribute("stroke", "#facc15");
    } else {
      circle.setAttribute("stroke", "#1e3a8a");
    }
  });
}

function simular() {
  const cadena = document.getElementById('cadena').value;
  if (!inicial) {
    alert("Debes marcar un estado inicial.");
    return;
  }

  let visitados = new Set();
  let aceptada = procesar(inicial.id, cadena, 0, visitados);
  alert(aceptada ? "✅ Cadena ACEPTADA" : "❌ Cadena RECHAZADA");
}

function procesar(estadoActual, cadena, pos, visitados) {
  const clave = `${estadoActual}-${pos}`;
  if (visitados.has(clave)) return false;
  visitados.add(clave);

  if (pos === cadena.length) {
    const e = estados.find(e => e.id === estadoActual);
    if (e.final) return true;

    const transLambdas = transiciones.filter(t =>
      t.origen.id === estadoActual && t.simbolo.split(',').includes("λ")
    );

    return transLambdas.some(t => procesar(t.destino.id, cadena, pos, visitados));
  }

  const simbolo = cadena[pos];

  const transNormales = transiciones.filter(t =>
    t.origen.id === estadoActual && t.simbolo.split(',').includes(simbolo)
  );
  for (let t of transNormales) {
    if (procesar(t.destino.id, cadena, pos + 1, visitados)) return true;
  }

  const transLambdas = transiciones.filter(t =>
    t.origen.id === estadoActual && t.simbolo.split(',').includes("λ")
  );
  for (let t of transLambdas) {
    if (procesar(t.destino.id, cadena, pos, visitados)) return true;
  }

  return false;
}


function iniciarSimulacion() {
  simulacionCadena = document.getElementById('cadena').value;
  if (!inicial) {
    alert("Debes marcar un estado inicial.");
    return;
  }
  simulacionPos = 0;
  simulacionEstado = inicial.id;
  simulacionEnCurso = true;
  mostrarEstadoActual();
}

let simulacionCola = [];
let simulacionVisitados = new Set();

function iniciarSimulacionPaso() {
  document.getElementById('btnSiguientePaso').style.display = 'block';

  if (!inicial) {
    alert("Debes marcar un estado inicial.");
    return;
  }

  const cadena = document.getElementById('cadena').value;
  simulacionCadena = cadena;
  simulacionCola = [{ estado: inicial.id, pos: 0, ruta: [] }];
  simulacionVisitados = new Set();
  simulacionEnCurso = true;

  mostrarEstadoActual(); // Marca inicial
}

function siguientePaso() {
  if (!simulacionEnCurso) {
    alert("Inicia la simulación primero.");
    return;
  }

  if (simulacionCola.length === 0) {
    alert("❌ Cadena RECHAZADA. No hay más caminos.");
    simulacionEnCurso = false;
    return;
  }

  const actual = simulacionCola.shift(); // saco un camino
  const clave = `${actual.estado}-${actual.pos}`;
  if (simulacionVisitados.has(clave)) {
    siguientePaso(); // salta a otro
    return;
  }
  simulacionVisitados.add(clave);

  simulacionEstado = actual.estado;
  simulacionPos = actual.pos;
  mostrarEstadoActual();

  const estadoObj = estados.find(e => e.id === actual.estado);

  // ✅ Si ya leí toda la cadena y estoy en un final, éxito
  if (actual.pos === simulacionCadena.length && estadoObj.final) {
    alert("✅ Cadena ACEPTADA");
    simulacionEnCurso = false;
    return;
  }

  // 🔄 Agregar transiciones válidas normales
  const simbolo = simulacionCadena[actual.pos];
  const transNormales = transiciones.filter(t =>
    t.origen.id === actual.estado &&
    t.simbolo.split(',').includes(simbolo)
  );
  for (let t of transNormales) {
    simulacionCola.push({
      estado: t.destino.id,
      pos: actual.pos + 1,
      ruta: [...actual.ruta, t]
    });
  }

  // 🔁 Transiciones lambda
  const transLambdas = transiciones.filter(t =>
    t.origen.id === actual.estado &&
    t.simbolo.split(',').includes("λ")
  );
  for (let t of transLambdas) {
    simulacionCola.push({
      estado: t.destino.id,
      pos: actual.pos,
      ruta: [...actual.ruta, t]
    });
  }

  if (simulacionCola.length === 0) {
    alert("❌ Cadena RECHAZADA");
    simulacionEnCurso = false;
  }
}

function mostrarEstadoActual() {
  estados.forEach(e => {
    const g = Array.from(canvas.querySelectorAll("g")).find(g => g.dataset.id === e.id);
    const circle = g.querySelector("circle");
    if (e.id === simulacionEstado) {
      circle.setAttribute("stroke", "red");  // Resalta el estado actual
      circle.setAttribute("stroke-width", 4);
    } else {
      // Restaurar colores normales
      if (e.inicial) circle.setAttribute("stroke", "#22c55e");
      else if (e.final) circle.setAttribute("stroke", "#facc15");
      else circle.setAttribute("stroke", "#1e3a8a");
      circle.setAttribute("stroke-width", 2);
    }
  });
}

// Mostrar el botón siguiente paso sólo en modo paso a paso:
document.getElementById('btnSiguientePaso').style.display = 'none'; // por defecto oculto

function simularRapida() {
  document.getElementById('btnSiguientePaso').style.display = 'none';
  // Aquí va la simulación normal completa (como tu función simular original)
  simular();
}

function procesarPaso() {
  if (simulacionCola.length === 0) {
    alert("❌ Cadena RECHAZADA. No hay más caminos.");
    simulacionEnCurso = false;
    return;
  }

  const actual = simulacionCola.shift();
  const clave = `${actual.estado}-${actual.pos}`;

  if (simulacionVisitados.has(clave)) {
    // Ya visitado, procesar siguiente estado en cola (recursivamente)
    return procesarPaso();
  }

  simulacionVisitados.add(clave);
  simulacionEstado = actual.estado;
  simulacionPos = actual.pos;
  mostrarEstadoActual();

  const estadoObj = estados.find(e => e.id === actual.estado);

  if (actual.pos === simulacionCadena.length && estadoObj.final) {
    alert("✅ Cadena ACEPTADA");
    simulacionEnCurso = false;
    return;
  }

  const simbolo = simulacionCadena[actual.pos];

  // Transiciones normales
  const transNormales = transiciones.filter(t =>
    t.origen.id === actual.estado && t.simbolo.split(',').includes(simbolo)
  );
  for (let t of transNormales) {
    simulacionCola.push({
      estado: t.destino.id,
      pos: actual.pos + 1,
      ruta: [...actual.ruta, t]
    });
  }

  // Transiciones lambda
  const transLambdas = transiciones.filter(t =>
    t.origen.id === actual.estado && t.simbolo.split(',').includes("λ")
  );
  for (let t of transLambdas) {
    simulacionCola.push({
      estado: t.destino.id,
      pos: actual.pos,
      ruta: [...actual.ruta, t]
    });
  }
}

function iniciarSimulacionPaso() {
  if (!inicial) {
    alert("Debes marcar un estado inicial.");
    return;
  }

  document.getElementById('btnSiguientePaso').style.display = 'block';

  simulacionCadena = document.getElementById('cadena').value;
  simulacionCola = [{ estado: inicial.id, pos: 0, ruta: [] }];
  simulacionVisitados = new Set();
  simulacionEnCurso = true;

  // Procesar el primer paso inmediatamente
  procesarPaso();
}

function siguientePaso() {
  if (!simulacionEnCurso) {
    alert("Inicia la simulación primero.");
    return;
  }
  procesarPaso();
}
