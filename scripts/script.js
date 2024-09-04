const apiKey = '762fd054e0b8d14fd119bd8dd4e93416'; // Your provided API key

let map; // Global variable for the map
let precipitationLayer; // Global variable for the precipitation layer

// Function to determine if the input is a ZIP code
function isZipCode(input) {
    return /^\d{5}(?:[-\s]\d{4})?$/.test(input); // Matches US ZIP code formats: 12345 or 12345-6789
}

// Function to format city and state input
function formatCityStateInput(input) {
    const parts = input.split(/[\s,]+/).filter(Boolean);

    if (parts.length < 2) {
        return input; // Return original input if not enough parts to format
    }

    const city = parts[0]
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    const state = parts[1].toUpperCase();

    return `${city}, ${state}`;
}

// Fetch weather data based on city or ZIP code input
function fetchWeatherData(input) {
    if (isZipCode(input)) {
        // Fetch current weather data using ZIP code
        fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${input},US&appid=${apiKey}&units=imperial`)
            .then(handleWeatherResponse)
            .catch(handleError);

        // Fetch 5-day forecast using ZIP code
        fetchFiveDayForecastByZip(input);
    } else {
        const formattedInput = formatCityStateInput(input);
        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(formattedInput)},US&limit=1&appid=${apiKey}`;

        console.log(`Geocoding API URL: ${geocodeUrl}`); // Debugging: Log the URL

        fetch(geocodeUrl)
            .then(response => response.json())
            .then(data => {
                console.log('Geocoding API response:', data); // Debugging: Log the response
                if (!data || data.length === 0) {
                    throw new Error('Location not found. Please ensure city/state is correct.');
                }
                const { lat, lon } = data[0];

                // Fetch current weather data for the city
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`)
                    .then(handleWeatherResponse)
                    .catch(handleError);

                // Fetch 5-day forecast for the city
                fetchFiveDayForecast(lat, lon);

                // Update the radar map for the city
                updatePrecipitationRadar(lat, lon);
            })
            .catch(handleError);
    }
}

// Fetch 5-day forecast by latitude and longitude
function fetchFiveDayForecast(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`)
        .then(response => response.json())
        .then(displayFiveDayForecast)
        .catch(handleError);
}

// Fetch 5-day forecast by ZIP code
function fetchFiveDayForecastByZip(zip) {
    fetch(`https://api.openweathermap.org/data/2.5/forecast?zip=${zip},US&appid=${apiKey}&units=imperial`)
        .then(response => response.json())
        .then(displayFiveDayForecast)
        .catch(handleError);
}

// Display the 5-day forecast
function displayFiveDayForecast(data) {
    const forecastSection = document.getElementById('forecastDetails');
    if (!forecastSection) {
        console.error('Forecast section element not found');
        return;
    }
    forecastSection.innerHTML = ''; // Clear previous content

    // Group the data by days
    const dailyData = {};

    data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0]; // Extract the date part from the datetime string
        if (!dailyData[date]) {
            dailyData[date] = item; // Keep one entry per day
        }
    });

    // Display forecast for the next 5 days
    Object.values(dailyData).slice(0, 5).forEach(forecast => {
        const date = new Date(forecast.dt_txt).toLocaleDateString();
        const temperature = forecast.main.temp;
        const humidity = forecast.main.humidity;
        const windSpeed = forecast.wind.speed;
        const weatherIcon = `http://openweathermap.org/img/wn/${forecast.weather[0].icon}.png`;

        // Append each day's forecast to the section
        forecastSection.innerHTML += `
            <div class="forecast-day">
                <h3>${date}</h3>
                <img src="${weatherIcon}" alt="Weather Icon">
                <p>Temperature: ${temperature}°F</p>
                <p>Humidity: ${humidity}%</p>
                <p>Wind Speed: ${windSpeed} mph</p>
            </div>
        `;
    });
}

// Initialize or update the precipitation radar map using Leaflet.js
function updatePrecipitationRadar(lat, lon) {
    if (!map) {
        // Initialize the map if it hasn't been created yet
        map = L.map('precipitationMap').setView([lat, lon], 6);

        // Add OpenStreetMap tile layer as the base map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add OpenWeatherMap Precipitation Layer
        precipitationLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
            maxZoom: 19,
            attribution: '© OpenWeatherMap'
        }).addTo(map);
    } else {
        // Update the map center if the map is already initialized
        map.setView([lat, lon], 6);

        // If the precipitation layer is already present, do not add it again
        if (!precipitationLayer) {
            precipitationLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
                maxZoom: 19,
                attribution: '© OpenWeatherMap'
            }).addTo(map);
        } else {
            precipitationLayer.setUrl(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`); // Update the precipitation layer
        }
    }
}

// Handle API response for weather data
function handleWeatherResponse(response) {
    if (!response.ok) {
        throw new Error('City or ZIP code not found');
    }
    return response.json().then(data => {
        console.log(data); // Display data in the console for debugging
        displayCurrentWeather(data); // Function to display current weather
    });
}

function handleError(error) {
    console.error('Error fetching weather data:', error);
    alert(error.message); // Display error to the user
}

// Function to display current weather
function displayCurrentWeather(data) {
    const currentWeatherSection = document.getElementById('currentWeather');
    if (!currentWeatherSection) {
        console.error('Current weather section element not found');
        return;
    }
    const cityName = data.name;
    const temperature = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;
    const weatherIcon = `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`;

    // Clear previous content
    currentWeatherSection.innerHTML = `
        <h2>${cityName}</h2>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <img src="${weatherIcon}" alt="Weather Icon">
        <p>Temperature: ${temperature}°F</p>
        <p>Humidity: ${humidity}%</p>
        <p>Wind Speed: ${windSpeed} mph</p>
    `;
}

// Initialize search history display and the radar map
document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('cityInput');
    const searchBtn = document.getElementById('searchBtn');

    if (!cityInput || !searchBtn) {
        console.error('One or more required elements (cityInput, searchBtn) are not found.');
        return;
    }

    // Event listener for search button click
    searchBtn.addEventListener('click', () => {
        const input = cityInput.value.trim(); // Get input value and trim whitespace
        if (input) {
            fetchWeatherData(input);
        } else {
            alert('Please enter a city name or ZIP code.'); // Alert if input is empty
        }
    });

    // Event listener for 'Enter' key press in search input
    cityInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { // Check if the pressed key is 'Enter'
            event.preventDefault(); // Prevent the default form submission behavior
            searchBtn.click(); // Trigger a click on the search button
        }
    });

    // Initialize search history display
    displaySearchHistory();
});
