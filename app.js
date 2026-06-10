// Variables globales de estado
let num = 0;                  // Índice de la pregunta actual
let xmlDoc = null;            // Archivo XML parseado en memoria
let preguntas = [];           // Colección de nodos <question>
let puntuacion = 0;           // Contador de respuestas acertadas
let respondido = false;       // Bandera para evitar múltiples clicks por pregunta

// Control del Cronómetro
let tiempoSegundos = 0;
let intervaloReloj = null;

// Literales multiidioma para la interfaz dinámica
const literales = {
    es: {
        timeLabel: "Tiempo:",
        nextBtn: "Siguiente",
        finishBtn: "Finalizar Test",
        progress: "Pregunta",
        de: "de",
        welcomeTitle: "¡Bienvenido al Test Interactivo!",
        welcomeDesc: "Pon a prueba tus conocimientos sobre desarrollo Web y XML. Son 20 preguntas.",
        startBtn: "Comenzar",
        resultTitle: "Fin de la prueba",
        summaryTime: "Tiempo empleado: ",
        restartBtn: "Intentar de nuevo"
    },
    en: {
        timeLabel: "Time:",
        nextBtn: "Next",
        finishBtn: "Finish Quiz",
        progress: "Question",
        de: "of",
        welcomeTitle: "Welcome to the Interactive Quiz!",
        welcomeDesc: "Test your knowledge about XML and DTD architectures. 20 questions total.",
        startBtn: "Start Quiz",
        resultTitle: "Quiz Finished",
        summaryTime: "Total time spent: ",
        restartBtn: "Try Again"
    }
};

/**
 * Petición AJAX asíncrona mediante XMLHttpRequest para cargar el XML según el idioma
 */
function cargarCuestionario() {
    const lang = document.getElementById("langSelect").value;
    const archivoXML = (lang === "es") ? "tecnologia_es.xml" : "xml_en.xml";
    
    document.getElementById("lbl-time").textContent = literales[lang].timeLabel;

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        if (this.status === 200 && this.responseXML) {
            xmlDoc = this.responseXML;
            preguntas = xmlDoc.getElementsByTagName("question");
            
            // Refrescar interfaz según la pantalla en la que se encuentre el usuario
            if (!document.getElementById("question-card").classList.contains("hidden")) {
                renderizarPreguntaActual();
            } else if (!document.getElementById("welcome-screen").classList.contains("hidden")) {
                actualizarPantallaBienvenida(lang);
            }
        }
    };
    xhttp.open("GET", archivoXML, true);
    xhttp.send();
}

function actualizarPantallaBienvenida(lang) {
    document.getElementById("welcome-title").textContent = literales[lang].welcomeTitle;
    document.getElementById("welcome-desc").textContent = literales[lang].welcomeDesc;
    document.getElementById("btn-start").textContent = literales[lang].startBtn;
}

/**
 * Cambia el archivo XML activo y reinicia los componentes de juego
 */
function cambiarIdioma() {
    clearInterval(intervaloReloj);
    tiempoSegundos = 0;
    document.getElementById("timer").textContent = "00:00";
    
    document.getElementById("question-card").classList.add("hidden");
    document.getElementById("result-screen").classList.add("hidden");
    document.getElementById("welcome-screen").classList.remove("hidden");
    
    num = 0;
    puntuacion = 0;
    cargarCuestionario();
}

function iniciarQuiz() {
    document.getElementById("welcome-screen").classList.add("hidden");
    document.getElementById("question-card").classList.remove("hidden");
    
    tiempoSegundos = 0;
    intervaloReloj = setInterval(actualizarReloj, 1000);
    
    renderizarPreguntaActual();
}

function actualizarReloj() {
    tiempoSegundos++;
    let minutos = Math.floor(tiempoSegundos / 60);
    let segundos = tiempoSegundos % 60;
    
    minutos = minutos < 10 ? "0" + minutos : minutos;
    segundos = segundos < 10 ? "0" + segundos : segundos;
    
    document.getElementById("timer").textContent = `${minutos}:${segundos}`;
}

/**
 * Mapea los nodos XML al DOM dinámico en formato presentación
 */
function renderizarPreguntaActual() {
    respondido = false;
    const lang = document.getElementById("langSelect").value;
    
    const btnNext = document.getElementById("btn-next");
    btnNext.disabled = true;
    btnNext.textContent = (num === preguntas.length - 1) ? literales[lang].finishBtn : literales[lang].nextBtn;
    
    // Progreso
    document.getElementById("question-progress").textContent = 
        `${literales[lang].progress} ${num + 1} ${literales[lang].de} ${preguntas.length}`;
    
    // Enunciado extraído del nodo <wording>
    const enunciadoText = preguntas[num].getElementsByTagName("wording")[0].textContent;
    document.getElementById("question-wording").textContent = enunciadoText;
    
    // Opciones extraídas de los nodos <choice>
    const opcionesContainer = document.getElementById("choices-container");
    opcionesContainer.innerHTML = ""; 
    
    const opcionesNodos = preguntas[num].getElementsByTagName("choice");
    
    for (let i = 0; i < opcionesNodos.length; i++) {
        const botonOpcion = document.createElement("button");
        botonOpcion.className = "choice-btn";
        botonOpcion.textContent = opcionesNodos[i].textContent;
        
        // Almacenar la validez mediante data-attributes
        const esCorrecta = opcionesNodos[i].getAttribute("correct") === "yes";
        botonOpcion.dataset.correct = esCorrecta;
        
        botonOpcion.onclick = function() {
            evaluarRespuesta(this, opcionesContainer);
        };
        
        opcionesContainer.appendChild(botonOpcion);
    }
}

/**
 * Valida la respuesta del usuario interactivo y marca aciertos/errores en CSS
 */
function evaluarRespuesta(botonSeleccionado, contenedor) {
    if (respondido) return;
    respondido = true;
    
    const esCorrecta = botonSeleccionado.dataset.correct === "true";
    
    if (esCorrecta) {
        botonSeleccionado.classList.add("correct");
        puntuacion++;
    } else {
        botonSeleccionado.classList.add("incorrect");
        // Revelar de forma asistida cuál era la opción correcta
        const botones = contenedor.getElementsByClassName("choice-btn");
        for (let btn of botones) {
            if (btn.dataset.correct === "true") {
                btn.classList.add("correct");
            }
        }
    }
    
    // Desactivar el resto de opciones de la tarjeta actual
    const botones = contenedor.getElementsByClassName("choice-btn");
    for (let btn of botones) {
        btn.disabled = true;
    }
    
    document.getElementById("btn-next").disabled = false;
}

function muestraSiguiente() {
    num++;
    if (num < preguntas.length) {
        renderizarPreguntaActual();
    } else {
        finalizarQuiz();
    }
}

/**
 * Detiene los hilos del tiempo y computa las notas finales
 */
function finalizarQuiz() {
    clearInterval(intervaloReloj);
    const lang = document.getElementById("langSelect").value;
    
    document.getElementById("question-card").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
    
    document.getElementById("result-title").textContent = literales[lang].resultTitle;
    document.getElementById("score-text").textContent = `${puntuacion} / ${preguntas.length}`;
    document.getElementById("result-time-summary").textContent = 
        `${literales[lang].summaryTime} ${document.getElementById("timer").textContent}`;
    document.getElementById("btn-restart").textContent = literales[lang].restartBtn;
}

function reiniciarQuiz() {
    num = 0;
    puntuacion = 0;
    document.getElementById("result-screen").classList.add("hidden");
    iniciarQuiz();
}

// Inicialización automatizada
window.onload = cargarCuestionario;