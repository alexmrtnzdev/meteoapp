const WeatherApp = (() => {
    const state = {
        unit: 'celsius',
        theme: 'light',
        currentWeather: null,
        charts: {},
        currentView: 'daily'
    };

    const elements = {
        cityInput: document.getElementById('cityInput'),
        searchBtn: document.getElementById('searchBtn'),
        themeToggle: document.getElementById('themeToggle'),
        unitToggle: document.getElementById('unitToggle'),
        selectedCity: document.getElementById('selectedCity'),
        currentTemp: document.getElementById('currentTemp'),
        weatherCondition: document.getElementById('weatherCondition'),
        temperatureChart: document.getElementById('temperatureChart'),
        weatherCanvas: document.getElementById('weatherCanvas'),
        windSpeed: document.getElementById('windSpeed'),
        humidity: document.getElementById('humidity'),
        feelsLike: document.getElementById('feelsLike'),
        visibility: document.getElementById('visibility'),
        dailyView: document.getElementById('dailyView'),
        hourlyContainer: document.getElementById('hourlyContainer'),
        precipitationView: document.getElementById('precipitationView'),
        uvView: document.getElementById('uvView'),
        suggestions: document.getElementById('suggestions'),
        geolocationBtn: document.getElementById('geolocationBtn'),
        loading: document.getElementById('loading'),
        autoGeolocate: document.getElementById('autoGeolocate'),

    };

    const weatherCodes = {
        0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
        45: 'Niebla', 48: 'Niebla helada', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
        55: 'Llovizna intensa', 56: 'Llovizna helada', 57: 'Llovizna helada intensa',
        61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
        66: 'Lluvia helada', 67: 'Lluvia helada intensa', 71: 'Nieve ligera',
        73: 'Nieve moderada', 75: 'Nieve intensa', 77: 'Granizo', 80: 'Chubascos ligeros',
        81: 'Chubascos moderados', 82: 'Chubascos violentos', 85: 'Nevadas ligeras',
        86: 'Nevadas intensas', 95: 'Tormenta eléctrica', 96: 'Tormenta con granizo',
        99: 'Tormenta intensa'
    };

    // inicia todo
    const init = async () => {
        setupEventListeners();
        loadPreferences();
        setupCharts();
        applyTheme();
      
        // 🔒 Carga Madrid primero mientras se decide la geolocalización
        await loadDefaultCity();
      
        // Luego intentamos sobrescribir si se permite geolocalización
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords;
              elements.selectedCity.textContent = 'Cargando ubicación...';
              await getWeather(latitude, longitude);
              reverseGeocode(latitude, longitude);
            },
            (err) => {
              console.warn('Geolocalización denegada o fallida:', err.message);
              // No hace falta llamar de nuevo a Madrid, ya se cargó antes
            },
            { timeout: 5000 }
          );
        }
      };
      
      

      const loadDefaultCity = async () => {
        const lat = 40.4168;
        const lon = -3.7038;
        elements.selectedCity.textContent = 'Madrid, España';
        await getWeather(lat, lon); 
      };
      

      const reverseGeocode = (lat, lon) => {
        fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`)
          .then(res => res.json())
          .then(data => {
            if (data.results?.length) {
              const loc = data.results[0];
              elements.selectedCity.textContent = `${loc.name}, ${loc.country}`;
            }
          })
          .catch(() => {
            elements.selectedCity.textContent = 'Ubicación detectada';
          });
      };
      
      

    const setupEventListeners = () => {
        console.log('settingsBtn:', elements.settingsBtn);
console.log('tabs:', document.querySelectorAll('.tab'));
        elements.cityInput.addEventListener('input', debounce(handleInput, 300));
        elements.cityInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') handleSearch();
        });
        elements.searchBtn.addEventListener('click', handleSearch);
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.unitToggle.addEventListener('click', toggleUnit);
        elements.geolocationBtn.addEventListener('click', getGeolocation);
        // Abre/cierra panel de ajustes
  


        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => switchView(tab.dataset.view));
        });
    };

    // alterna tema
    const toggleTheme = () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', state.theme);
        applyTheme();
    };
    const applyTheme = () => {
        document.documentElement.setAttribute('data-theme', state.theme);
        elements.themeToggle.innerHTML = state.theme === 'light'
            ? '<i class="fas fa-moon"></i>'
            : '<i class="fas fa-sun"></i>';
    };

    // alterna unidades
    const toggleUnit = () => {
        state.unit = state.unit === 'celsius' ? 'fahrenheit' : 'celsius';
        localStorage.setItem('unit', state.unit);
        elements.unitToggle.innerHTML = state.unit === 'celsius'
            ? '<i class="fas fa-temperature-low"></i>'
            : '<i class="fas fa-temperature-high"></i>';
        // actualizar el texto de la unidad en pantalla:
        document.querySelector('.unit').textContent = state.unit === 'celsius' ? 'C' : 'F';
        updateUI();
        updateChart();
    };

    // cambio de vista
    // Cambia de pestaña sin dejar restos de datos anteriores
    // Muestra sólo la vista solicitada y oculta las demás
    const switchView = (view) => {
        console.log('Cambiando a vista:', view); // 👈
  state.currentView = view;
        state.currentView = view;
    
        // Cambiar pestaña activa
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => switchView(tab.dataset.view));
          });          
    
        // Mostrar solo la vista correspondiente
        document.querySelectorAll('.forecast-view').forEach(viewElement => {
            viewElement.classList.toggle('active', viewElement.id === `${view}View`);
        });
    
        // Actualiza contenido de la vista activa
        updateView();
    };
    
  


    // busca por texto
    const handleSearch = async () => {
        const q = elements.cityInput.value.trim();
        if (!q) return;
        try {
            const locs = await fetchLocations(q);
            if (locs.length) {
                const loc = locs[0];
                elements.selectedCity.textContent = `${loc.name}, ${loc.country}`;
                getWeather(loc.latitude, loc.longitude);
            }
        } catch (err) { console.error(err); }
    };

    // sugerencias al tipear
    const handleInput = async e => {
        const q = e.target.value.trim();
        if (q.length < 3) {
            elements.suggestions.innerHTML = '';
            return;
        }
        try {
            const locs = await fetchLocations(q);
            showSuggestions(locs);
        } catch (err) {
            console.error(err);
        }
    };
    const fetchLocations = async q => {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=5`);
        const d = await res.json();
        return d.results || [];
    };
    const showSuggestions = locs => {
        elements.suggestions.innerHTML = locs.map(loc => `
          <li class="suggestion-item" data-lat="${loc.latitude}" data-lon="${loc.longitude}">
            <img src="https://flagcdn.com/24x18/${loc.country_code.toLowerCase()}.png"
                 alt="${loc.country}" class="flag-icon"/>
            <span class="city-name">${loc.name}</span>,
            <span class="country-name">${loc.country}</span>
          </li>
        `).join('');

        // Listener para cada sugerencia
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const city = item.querySelector('.city-name').textContent;
                const country = item.querySelector('.country-name').textContent;
                elements.cityInput.value = `${city}, ${country}`;
                elements.selectedCity.textContent = `${city}, ${country}`;
                elements.suggestions.innerHTML = '';
                getWeather(item.dataset.lat, item.dataset.lon);
            });
        });
    };

    // obtiene datos
    const getWeather = async (lat, lon) => {
        try {
            showLoading(true);
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,visibility` +
                `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto`;
            const r = await fetch(url);
            const d = await r.json();
            state.currentWeather = processWeatherData(d);
            updateUI();
            updateChart();
            drawWeatherIcon();
        } catch {
            showError('Error obteniendo datos');
        } finally {
            showLoading(false);
        }
    };
    const processWeatherData = d => ({
        current: d.current_weather,
        hourly: d.hourly,
        daily: d.daily
    });

    // actualiza interfaz principal
    const updateUI = () => {
        if (!state.currentWeather) return;
        const { current, hourly } = state.currentWeather;
        const idx = hourly.time.findIndex(t => t === current.time);
        const h = idx >= 0 ? hourly.relative_humidity_2m[idx] : hourly.relative_humidity_2m[0];
        const fT = idx >= 0 ? hourly.apparent_temperature[idx] : hourly.apparent_temperature[0];
        const v = idx >= 0 ? hourly.visibility[idx] : hourly.visibility[0];

        const temp = convertTemp(current.temperature);
        elements.currentTemp.textContent = temp;
        elements.weatherCondition.textContent = weatherCodes[current.weathercode];
        elements.windSpeed.textContent = `${current.windspeed.toFixed(1)} km/h`;
        elements.humidity.textContent = `${h}%`;
        elements.feelsLike.textContent = convertTemp(fT);
        elements.visibility.textContent = `${(v / 1000).toFixed(1)} km`;
        // ===== Siempre actualizar próximas horas =====
        elements.hourlyContainer.innerHTML = state.currentWeather.hourly.time.slice(0, 24).map((t, i) => `
<div class="hourly-item">
  <time>${new Date(t).getHours().toString().padStart(2, '0')}:00</time>
  <div class="temp">${convertTemp(state.currentWeather.hourly.temperature_2m[i])}°</div>
  <div class="icon">${getWeatherIcon(state.currentWeather.hourly.weathercode[i])}</div>
</div>
`).join('');


        // actualizamos unidad si cambió mientras cargaba:
        document.querySelector('.unit').textContent = state.unit === 'celsius' ? 'C' : 'F';

        updateDailyForecast(state.currentWeather.daily);
    };

    // fondo dinámico según weathercode
    const setBackground = code => {
        const bg = document.getElementById('dynamic-background');
        if ([0, 1].includes(code)) bg.style.background = 'linear-gradient(to bottom, #87CEEB, #FFF)';
        else if ([2, 3].includes(code)) bg.style.background = 'linear-gradient(to bottom, #778899, #B0C4DE)';
        else if ([45, 48].includes(code)) bg.style.background = 'linear-gradient(to bottom, #696969, #A9A9A9)';
        else if ([51, 53, 55, 61, 63, 65].includes(code))
            bg.style.background = 'linear-gradient(to bottom, #2F4F4F, #708090)';
        else if ([71, 73, 75, 77, 85, 86].includes(code))
            bg.style.background = 'linear-gradient(to bottom, #00BFFF, #FFF)';
        else if ([95, 96, 99].includes(code)) bg.style.background = 'linear-gradient(to bottom, #1E1E1E, #3F3F3F)';
    };

    // pronóstico diario
// Modificar updateDailyForecast
const updateDailyForecast = (daily) => {
    // 1. Generar el HTML de los días
    elements.dailyView.innerHTML = daily.time.map((date, i) => `
      <div class="day-item">
        <time>${new Date(date).toLocaleDateString('es-ES', { weekday: 'short' })}</time>
        <div class="date">${new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
        <div class="temp">${convertTemp(daily.temperature_2m_max[i])}° / ${convertTemp(daily.temperature_2m_min[i])}°</div>
        <div class="icon">${getWeatherIcon(daily.weathercode[i])}</div>
      </div>
    `).join('');
  
    // 2. Añadir listeners una vez renderizado el contenido
    document.querySelectorAll('.day-item').forEach((item, i) => {
      item.addEventListener('click', () => showPopup(daily, i));
    });
  };
  
  
  

    // vistas UV / precipitación / horas
    const updateView = () => {
  if (!state.currentWeather) return;
  const { daily } = state.currentWeather;

  // 1) Limpiar TODAS las vistas
  elements.dailyView.innerHTML         = '';


  // 2) Rellenar SOLO la vista activa
  if (state.currentView === 'daily') {
    elements.dailyView.innerHTML = daily.time.map((date, i) => `
      <div class="day-forecast">
        <div class="day-header">
          <span>${new Date(date).toLocaleDateString('es-ES',{weekday:'short'})}</span>
          <span>${new Date(date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}</span>
        </div>
        <div class="day-details">
          <div class="temp-range">
            <i class="fas fa-temperature-high"></i> ${convertTemp(daily.temperature_2m_max[i])}°
            <i class="fas fa-temperature-low"></i> ${convertTemp(daily.temperature_2m_min[i])}°
          </div>
          <div class="weather-icon">${getWeatherIcon(daily.weathercode[i])}</div>
          <div class="precipitation">
            <i class="fas fa-tint"></i> ${daily.precipitation_sum[i]} mm
          </div>
        </div>
      </div>
    `).join('');
  }
  else if (state.currentView === 'uv') {
    elements.uvView.innerHTML = daily.time.map((date, i) => `
      <div class="uv-day">
        <span>${new Date(date).toLocaleDateString('es-ES',{weekday:'short'})}</span>
        <div class="bar" style="height:${daily.uv_index_max[i] * 10}px"></div>
        <span>UV ${daily.uv_index_max[i]}</span>
      </div>
    `).join('');
  }
  else if (state.currentView === 'precipitation') {
    elements.precipitationView.innerHTML = daily.time.map((date, i) => `
      <div class="precipitation-day">
        <span>${new Date(date).toLocaleDateString('es-ES',{weekday:'short'})}</span>
        <div class="bar" style="height:${daily.precipitation_sum[i] * 2}px"></div>
        <span>${daily.precipitation_sum[i]} mm</span>
      </div>
    `).join('');
  }
};

const showPopup = (daily, index) => {
    const popupOverlay = document.getElementById('popupOverlay');
    const popupDetails = document.getElementById('popupDetails');
  
    const date = new Date(daily.time[index]).toLocaleDateString('es-ES', {
      weekday: 'long', day: '2-digit', month: 'short'
    });
  
    popupDetails.innerHTML = `
      <h2>${date}</h2>
      <div class="info-group"><span class="info-label">Temperatura máxima:</span> <span class="info-value">${convertTemp(daily.temperature_2m_max[index])}°</span></div>
      <div class="info-group"><span class="info-label">Temperatura mínima:</span> <span class="info-value">${convertTemp(daily.temperature_2m_min[index])}°</span></div>
      <div class="info-group"><span class="info-label">Precipitación:</span> <span class="info-value">${daily.precipitation_sum[index]} mm</span></div>
      <div class="info-group"><span class="info-label">Índice UV máx:</span> <span class="info-value">${daily.uv_index_max[index]}</span></div>
      <div class="info-group"><span class="info-label">Condición:</span> <span class="info-value">${weatherCodes[daily.weathercode[index]] || 'Desconocido'}</span></div>
    `;
  
    popupOverlay.classList.add('active'); // ✅ Mostramos correctamente
  };
  

// cerrar el popup
document.getElementById('popupClose').addEventListener('click', () => {
    document.getElementById('popupOverlay').classList.remove('active'); // ✅ Ocultamos correctamente
  });
document.getElementById('popupOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'popupOverlay') {
      e.currentTarget.classList.remove('active');
    }
  });
  


  

    // iconos Chart.js
    const setupCharts = () => {
        const ctx = elements.temperatureChart.getContext('2d');
        state.charts.temperature = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(24).fill('--'),
                datasets: [{
                    label: 'Temperatura',
                    data: Array(24).fill(0),
                    tension: 0.4,
                    fill: true,
                    borderColor: '#2A7FFF',
                    backgroundColor: createGradient()
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Hora' } },
                    y: {
                        title: { display: true, text: state.unit === 'celsius' ? '°C' : '°F' },
                        beginAtZero: false,
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.parsed.y} ${state.unit === 'celsius' ? '°C' : '°F'}`
                        }
                    }
                }
            }
        });
    };
    

    const updateChart = () => {
        if (!state.currentWeather) return;
        const { hourly } = state.currentWeather;
      
        const labels = hourly.time.slice(0, 24).map(t =>
          new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit' })
        );
      
        const convertedTemps = hourly.temperature_2m.slice(0, 24).map(t => convertTemp(t));
      
        state.charts.temperature.data.labels = labels;
        state.charts.temperature.data.datasets[0].data = convertedTemps;
      
        // Ajustar el eje Y dinámicamente según los datos
        const min = Math.min(...convertedTemps);
        const max = Math.max(...convertedTemps);
        state.charts.temperature.options.scales.y.min = Math.floor(min - 2);
        state.charts.temperature.options.scales.y.max = Math.ceil(max + 2);
      
        state.charts.temperature.options.scales.y.title.text = state.unit === 'celsius' ? '°C' : '°F';
      
        state.charts.temperature.update();
      };
    const createGradient = () => {
        const ctx = elements.temperatureChart.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        g.addColorStop(0, 'rgba(42,127,255,0.2)');
        g.addColorStop(1, 'rgba(42,127,255,0)');
        return g;
    };

    // iconos
    const getWeatherIcon = code => {
        const map = {
            0: 'sun', 1: 'cloud-sun', 2: 'cloud', 3: 'cloud',
            45: 'smog', 48: 'smog', 51: 'cloud-rain', 53: 'cloud-showers-heavy',
            55: 'cloud-showers-heavy', 61: 'cloud-showers-heavy', 63: 'cloud-showers-heavy',
            65: 'cloud-showers-heavy', 71: 'snowflake', 73: 'snowflake', 75: 'snowflake',
            77: 'cloud-hail', 80: 'cloud-showers-heavy', 81: 'cloud-showers-heavy',
            85: 'snowflake', 86: 'snowflake', 95: 'bolt', 96: 'cloud-bolt', 99: 'cloud-bolt'
        };
        return `<i class="fas fa-${map[code] || 'sun'}"></i>`;
    };

    const drawWeatherIcon = () => {
        const iconContainer = document.createElement('div');
        iconContainer.className = 'main-weather-icon';
        iconContainer.innerHTML = getWeatherIcon(state.currentWeather.current.weathercode);
        
        const existingIcon = document.querySelector('.main-weather-icon');
        if (existingIcon) existingIcon.remove();
        
        elements.weatherCanvas.insertAdjacentElement('afterend', iconContainer);
      };

    // utilidades
    const convertTemp = t => state.unit === 'celsius'
        ? t.toFixed(1) : (t * 9 / 5 + 32).toFixed(1);
    const debounce = (fn, ms) => {
        let id; return (...a) => {
            clearTimeout(id);
            id = setTimeout(() => fn.apply(this, a), ms);
        };
    };


    const loadPreferences = () => {
        const t = localStorage.getItem('theme'), u = localStorage.getItem('unit');
        if (t) { state.theme = t; applyTheme(); }
        if (u) state.unit = u;
    };

    const getGeolocation = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            elements.selectedCity.textContent = 'Cargando ubicación...';
            fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`)
              .then((r) => r.json())
              .then((data) => {
                if (data.results?.length) {
                  const loc = data.results[0];
                  elements.selectedCity.textContent = `${loc.name}, ${loc.country}`;
                } else {
                  elements.selectedCity.textContent = 'Mi ubicación';
                }
              })
              .catch(() => {
                elements.selectedCity.textContent = 'Mi ubicación';
              });
            getWeather(latitude, longitude);
          },
          (err) => {
            console.warn('Geolocalización denegada o fallida:', err.message);
            // 👇 Cargar por defecto Madrid si falla o se deniega
            elements.selectedCity.textContent = 'Madrid, España';
            getWeather(40.4168, -3.7038); // Coordenadas de Madrid
          }
        );
      };
      

    // ... resto de funciones (setupEventListeners, handleSearch, etc.)

    const showLoading = s => elements.loading.style.display = s ? 'flex' : 'none';
    const showError = msg => {
        const e = document.createElement('div');
        e.className = 'error-message';
        e.textContent = msg;
        document.body.appendChild(e);
        setTimeout(() => e.remove(), 3000);
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', WeatherApp.init);