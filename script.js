const API_KEY =
    typeof WEATHER_API !== "undefined"
        ? WEATHER_API
        : "1108bd1f3f6aef1eadac57b3e2629790";
document.addEventListener("DOMContentLoaded", function () {
    // API configuration
    const WeatherApp = {
        config: {
            apiKey: API_KEY,
            baseUrl: "https://api.openweathermap.org/data/2.5",
            units: "metric",
        },

        elements: {
            citySearch: document.getElementById("city-search"),
            locationBtn: document.getElementById("location-btn"),
            searchSuggestions: document.getElementById("search-suggestions"),
            currentDate: document.getElementById("current-date"),
            loadingSkeleton: document.getElementById("loading-skeleton"),
            weatherContent: document.getElementById("weather-content"),
            weatherIcon: document.getElementById("weather-icon"),
            currentTemp: document.getElementById("current-temp"),
            tempUnit: document.getElementById("temp-unit"),
            weatherCondition: document.getElementById("weather-condition"),
            location: document.getElementById("location"),
            humidity: document.getElementById("humidity"),
            wind: document.getElementById("wind"),
            feelsLike: document.getElementById("feels-like"),
            mainCard: document.getElementById("main-card"),
            weatherInsights: document.getElementById("weather-insights"),
            insightText: document.getElementById("insight-text"),
            forecastContainer: document.getElementById("forecast-container"),
            weatherEffects: document.getElementById("weather-effects"),
            body: document.body,
        },

        state: {
            currentWeather: null,
            forecast: null,
            lastSearched: null,
            debounceTimer: null,
        },

        init: function () {
            // Set current date
            this.updateCurrentDate();

            // Load last searched location or get current location
            this.loadLastLocation();

            // Set up event listeners
            this.setupEventListeners();
        },

        setupEventListeners: function () {
            // Location button click
            this.elements.locationBtn.addEventListener("click", () => {
                this.getUserLocation();
            });

            // City search input
            this.elements.citySearch.addEventListener("input", (e) => {
                this.handleSearchInput(e.target.value);
            });

            // Search input focus/blur
            this.elements.citySearch.addEventListener("focus", () => {
                this.elements.citySearch.parentElement.classList.add("focused");
            });

            this.elements.citySearch.addEventListener("blur", () => {
                setTimeout(() => {
                    this.elements.citySearch.parentElement.classList.remove("focused");
                    this.elements.searchSuggestions.classList.add("hidden");
                }, 200);
            });

            // Click outside suggestions
            document.addEventListener("click", (e) => {
                if (
                    !this.elements.searchSuggestions.contains(e.target) &&
                    !this.elements.citySearch.contains(e.target)
                ) {
                    this.elements.searchSuggestions.classList.add("hidden");
                }
            });
        },

        updateCurrentDate: function () {
            const options = {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            };
            const now = new Date();
            this.elements.currentDate.textContent = now.toLocaleDateString(
                "en-US",
                options
            );
        },

        loadLastLocation: function () {
            const lastLocation = localStorage.getItem("lastLocation");
            if (lastLocation) {
                this.state.lastSearched = JSON.parse(lastLocation);
                this.elements.citySearch.value = this.state.lastSearched.name;
                this.getWeatherByCoords(
                    this.state.lastSearched.lat,
                    this.state.lastSearched.lon
                );
            } else {
                this.getUserLocation();
            }
        },

        getUserLocation: function () {
            this.showLoadingState();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        this.getWeatherByCoords(latitude, longitude);
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        this.showErrorState(
                            "Location access denied. Please search for a city."
                        );

                        // Fallback to a default city
                        this.getWeatherByCity("London");
                    }
                );
            } else {
                this.showErrorState(
                    "Geolocation is not supported by your browser. Please search for a city."
                );
                this.getWeatherByCity("London");
            }
        },

        handleSearchInput: function (query) {
            if (query.length < 2) {
                this.elements.searchSuggestions.classList.add("hidden");
                return;
            }

            clearTimeout(this.state.debounceTimer);

            this.state.debounceTimer = setTimeout(() => {
                this.searchCities(query);
            }, 300);
        },

        searchCities: async function (query) {
            try {
                const response = await fetch(
                    `${this.config.baseUrl}/find?q=${query}&appid=${this.config.apiKey}&units=${this.config.units}`
                );
                const data = await response.json();

                if (data.list && data.list.length > 0) {
                    this.showSearchSuggestions(data.list);
                } else {
                    this.elements.searchSuggestions.classList.add("hidden");
                }
            } catch (error) {
                console.error("Error searching cities:", error);
                this.elements.searchSuggestions.classList.add("hidden");
            }
        },

        showSearchSuggestions: function (cities) {
            this.elements.searchSuggestions.innerHTML = "";
            this.elements.searchSuggestions.classList.remove("hidden");

            // Limit to 5 suggestions
            const limitedCities = cities.slice(0, 5);

            limitedCities.forEach((city) => {
                const suggestion = document.createElement("div");
                suggestion.className =
                    "px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors";
                suggestion.textContent = `${city.name}, ${city.sys.country}`;

                suggestion.addEventListener("click", () => {
                    this.elements.citySearch.value = `${city.name}, ${city.sys.country}`;
                    this.elements.searchSuggestions.classList.add("hidden");
                    this.getWeatherByCoords(city.coord.lat, city.coord.lon);
                });

                this.elements.searchSuggestions.appendChild(suggestion);
            });
        },

        getWeatherByCoords: async function (lat, lon) {
            this.showLoadingState();

            try {
                // Get current weather
                const currentResponse = await fetch(
                    `${this.config.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.config.apiKey}&units=${this.config.units}`
                );
                const currentData = await currentResponse.json();

                if (currentData.cod !== 200) {
                    throw new Error(
                        currentData.message || "Failed to fetch weather data"
                    );
                }

                // Get forecast
                const forecastResponse = await fetch(
                    `${this.config.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.config.apiKey}&units=${this.config.units}`
                );
                const forecastData = await forecastResponse.json();

                if (forecastData.cod !== "200") {
                    throw new Error(
                        forecastData.message || "Failed to fetch forecast data"
                    );
                }

                // Save to state
                this.state.currentWeather = currentData;
                this.state.forecast = forecastData;

                // Save as last searched
                this.state.lastSearched = {
                    name: `${currentData.name}, ${currentData.sys.country}`,
                    lat: lat,
                    lon: lon,
                };
                localStorage.setItem(
                    "lastLocation",
                    JSON.stringify(this.state.lastSearched)
                );

                // Update UI
                this.updateUI();
            } catch (error) {
                console.error("Error fetching weather data:", error);
                this.showErrorState(
                    error.message || "Failed to load weather data. Please try again."
                );
            }
        },

        getWeatherByCity: async function (city) {
            try {
                const response = await fetch(
                    `${this.config.baseUrl}/weather?q=${city}&appid=${this.config.apiKey}&units=${this.config.units}`
                );
                const data = await response.json();

                if (data.cod !== 200) {
                    throw new Error(data.message || "Failed to fetch weather data");
                }

                this.getWeatherByCoords(data.coord.lat, data.coord.lon);
            } catch (error) {
                console.error("Error fetching weather by city:", error);
                this.showErrorState(
                    error.message || "City not found. Please try another location."
                );
            }
        },

        updateUI: function () {
            // Hide loading skeleton
            this.elements.loadingSkeleton.classList.add("hidden");
            this.elements.weatherContent.classList.remove("hidden");
            this.elements.weatherInsights.classList.remove("hidden");

            // Update current weather
            const weather = this.state.currentWeather;
            const temp = Math.round(weather.main.temp);
            const feelsLike = Math.round(weather.main.feels_like);

            // Animate temperature counter
            this.animateCounter(this.elements.currentTemp, temp);

            this.elements.weatherCondition.textContent = weather.weather[0].main;
            this.elements.location.querySelector(
                "span"
            ).textContent = `${weather.name}, ${weather.sys.country}`;
            this.elements.humidity.textContent = `${weather.main.humidity}%`;
            this.elements.wind.textContent = `${Math.round(
                weather.wind.speed * 3.6
            )} km/h`;
            this.elements.feelsLike.textContent = `${feelsLike}°`;

            // Update weather icon
            this.setWeatherIcon(weather.weather[0].id, weather.weather[0].icon);

            // Update theme based on weather
            this.setTheme(weather.weather[0].id, weather.sys.sunset);

            // Update weather insights
            this.updateWeatherInsights(weather);

            // Update forecast
            this.updateForecast();

            // Add weather effects
            this.addWeatherEffects(weather.weather[0].id);
        },

        animateCounter: function (element, targetValue) {
            const duration = 1000; // 1 second
            const startValue = parseInt(element.textContent) || 0;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const currentValue = Math.floor(
                    startValue + (targetValue - startValue) * progress
                );

                element.textContent = currentValue;

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                }
            }

            requestAnimationFrame(updateCounter);
        },

        setWeatherIcon: function (weatherCode, iconCode) {
            const iconElement = this.elements.weatherIcon;
            iconElement.innerHTML = "";

            // Determine if it's day or night (iconCode ends with 'd' or 'n')
            const isDay = iconCode.endsWith("d");

            // Map weather codes to icons
            let iconClass = "fas fa-question";

            // Thunderstorm
            if (weatherCode >= 200 && weatherCode < 300) {
                iconClass = "fas fa-bolt";
            }
            // Drizzle
            else if (weatherCode >= 300 && weatherCode < 400) {
                iconClass = "fas fa-cloud-rain";
            }
            // Rain
            else if (weatherCode >= 500 && weatherCode < 600) {
                iconClass = "fas fa-umbrella";
            }
            // Snow
            else if (weatherCode >= 600 && weatherCode < 700) {
                iconClass = "far fa-snowflake";
            }
            // Atmosphere (fog, mist, etc.)
            else if (weatherCode >= 700 && weatherCode < 800) {
                iconClass = "fas fa-smog";
            }
            // Clear
            else if (weatherCode === 800) {
                iconClass = isDay ? "fas fa-sun" : "fas fa-moon";
            }
            // Clouds
            else if (weatherCode > 800 && weatherCode < 900) {
                if (weatherCode === 801) {
                    iconClass = isDay ? "fas fa-cloud-sun" : "fas fa-cloud-moon";
                } else {
                    iconClass = "fas fa-cloud";
                }
            }

            const icon = document.createElement("i");
            icon.className = `${iconClass} text-8xl`;

            // Add animation based on weather
            if (weatherCode === 800 && isDay) {
                icon.classList.add("animate-rotate");
            } else if (weatherCode >= 500 && weatherCode < 600) {
                icon.classList.add("animate-pulse");
            } else if (weatherCode >= 200 && weatherCode < 300) {
                icon.classList.add("animate-pulse");
            } else if (weatherCode >= 600 && weatherCode < 700) {
                icon.classList.add("animate-float");
            }

            iconElement.appendChild(icon);
        },

        setTheme: function (weatherCode, sunsetTime) {
            const now = Math.floor(Date.now() / 1000);
            const isNight = sunsetTime && now > sunsetTime;

            // Remove all theme classes
            this.elements.body.classList.remove(
                "theme-sunny",
                "theme-rainy",
                "theme-cloudy",
                "theme-snowy",
                "theme-night",
                "theme-default"
            );

            // Thunderstorm
            if (weatherCode >= 200 && weatherCode < 300) {
                this.elements.body.classList.add("theme-rainy");
            }
            // Drizzle or Rain
            else if (weatherCode >= 300 && weatherCode < 600) {
                this.elements.body.classList.add("theme-rainy");
            }
            // Snow
            else if (weatherCode >= 600 && weatherCode < 700) {
                this.elements.body.classList.add("theme-snowy");
            }
            // Atmosphere (fog, mist, etc.)
            else if (weatherCode >= 700 && weatherCode < 800) {
                this.elements.body.classList.add("theme-cloudy");
            }
            // Clear
            else if (weatherCode === 800) {
                if (isNight) {
                    this.elements.body.classList.add("theme-night");
                } else {
                    this.elements.body.classList.add("theme-sunny");
                }
            }
            // Clouds
            else if (weatherCode > 800 && weatherCode < 900) {
                this.elements.body.classList.add("theme-cloudy");
            } else {
                this.elements.body.classList.add("theme-default");
            }
        },

        updateWeatherInsights: function (weatherData) {
            const temp = weatherData.main.temp;
            const condition = weatherData.weather[0].main.toLowerCase();
            const windSpeed = weatherData.wind.speed;
            const humidity = weatherData.main.humidity;

            let insight = "";

            // Temperature-based insights
            if (temp > 30) {
                insight =
                    "Very hot today! Stay hydrated and avoid prolonged sun exposure.";
            } else if (temp > 20) {
                insight = "Pleasantly warm. Perfect for outdoor activities!";
            } else if (temp > 10) {
                insight = "Mild weather. A light jacket might be comfortable.";
            } else if (temp > 0) {
                insight = "Chilly today. Bundle up with a warm jacket.";
            } else {
                insight =
                    "Freezing cold! Wear multiple layers and limit time outdoors.";
            }

            // Condition-based additions
            if (condition.includes("rain")) {
                insight += " Don't forget your umbrella!";
            } else if (condition.includes("snow")) {
                insight += " Watch for slippery surfaces.";
            } else if (condition.includes("thunderstorm")) {
                insight += " Stay indoors if possible.";
            } else if (condition.includes("clear") && temp > 25) {
                insight += " Apply sunscreen to protect your skin.";
            }

            // Wind additions
            if (windSpeed > 8) {
                insight += " Windy conditions - secure loose items.";
            }

            // Humidity additions
            if (humidity > 80) {
                insight += " High humidity making it feel warmer.";
            } else if (humidity < 30) {
                insight += " Low humidity - stay hydrated.";
            }

            this.elements.insightText.textContent = insight;
        },

        updateForecast: function () {
            const forecastData = this.state.forecast;
            this.elements.forecastContainer.innerHTML = "";

            // Group forecast by day
            const dailyForecast = {};
            const now = new Date();
            const today = now.getDate();

            forecastData.list.forEach((item) => {
                const date = new Date(item.dt * 1000);
                const day = date.getDate();

                // Skip if it's today or if we already have data for this day
                if (
                    day === today ||
                    (dailyForecast[day] && dailyForecast[day].length >= 2)
                ) {
                    return;
                }

                if (!dailyForecast[day]) {
                    dailyForecast[day] = [];
                }

                dailyForecast[day].push(item);
            });

            // Create forecast cards for next 5 days
            const days = Object.keys(dailyForecast).slice(0, 5);

            days.forEach((day, index) => {
                const dayForecast = dailyForecast[day];
                const firstForecast = dayForecast[0];
                const date = new Date(firstForecast.dt * 1000);

                // Get min/max temps for the day
                let minTemp = firstForecast.main.temp_min;
                let maxTemp = firstForecast.main.temp_max;

                dayForecast.forEach((item) => {
                    minTemp = Math.min(minTemp, item.main.temp_min);
                    maxTemp = Math.max(maxTemp, item.main.temp_max);
                });

                // Create card
                const card = document.createElement("div");
                card.className =
                    "bg-white bg-opacity-20 rounded-xl p-4 flex flex-col items-center justify-between card-hover backdrop-blur-sm border border-white border-opacity-20";
                card.style.animationDelay = `${0.6 + index * 0.1}s`;
                card.classList.add("animate-slide-right");

                // Day name
                const dayName = document.createElement("div");
                dayName.className = "font-medium";

                if (index === 0) {
                    dayName.textContent = "Tomorrow";
                } else {
                    dayName.textContent = date.toLocaleDateString("en-US", {
                        weekday: "short",
                    });
                }

                // Weather icon
                const icon = document.createElement("div");
                icon.className = "text-4xl my-2";

                const weatherIcon = document.createElement("i");
                const isDay = firstForecast.weather[0].icon.endsWith("d");

                // Simplified icon selection for forecast
                if (
                    firstForecast.weather[0].id >= 200 &&
                    firstForecast.weather[0].id < 300
                ) {
                    weatherIcon.className = "fas fa-bolt";
                } else if (
                    firstForecast.weather[0].id >= 300 &&
                    firstForecast.weather[0].id < 600
                ) {
                    weatherIcon.className = "fas fa-cloud-rain";
                } else if (
                    firstForecast.weather[0].id >= 600 &&
                    firstForecast.weather[0].id < 700
                ) {
                    weatherIcon.className = "far fa-snowflake";
                } else if (firstForecast.weather[0].id === 800) {
                    weatherIcon.className = isDay ? "fas fa-sun" : "fas fa-moon";
                } else {
                    weatherIcon.className = "fas fa-cloud";
                }

                icon.appendChild(weatherIcon);

                // Temperatures
                const temps = document.createElement("div");
                temps.className = "flex justify-between w-full";

                const maxTempElement = document.createElement("span");
                maxTempElement.className = "font-semibold";
                maxTempElement.textContent = `${Math.round(maxTemp)}°`;

                const minTempElement = document.createElement("span");
                minTempElement.className = "opacity-70";
                minTempElement.textContent = `${Math.round(minTemp)}°`;

                temps.appendChild(maxTempElement);
                temps.appendChild(minTempElement);

                // Weather description
                const desc = document.createElement("div");
                desc.className = "text-sm opacity-90 mt-1 text-center";
                desc.textContent = firstForecast.weather[0].main;

                // Assemble card
                card.appendChild(dayName);
                card.appendChild(icon);
                card.appendChild(temps);
                card.appendChild(desc);

                this.elements.forecastContainer.appendChild(card);
            });
        },

        addWeatherEffects: function (weatherCode) {
            this.elements.weatherEffects.innerHTML = "";
            const bgElement = document.createElement("div");
            bgElement.className = "absolute inset-0 animate-gradient-flow";

            // Set different gradient backgrounds based on weather
            if (weatherCode >= 200 && weatherCode < 300) {
                // Thunderstorm
                bgElement.classList.add(
                    "bg-gradient-to-br",
                    "from-gray-700",
                    "to-gray-900"
                );
            } else if (weatherCode >= 300 && weatherCode < 600) {
                // Rain/Drizzle
                bgElement.classList.add(
                    "bg-gradient-to-br",
                    "from-blue-600",
                    "to-blue-900"
                );
            } else if (weatherCode >= 600 && weatherCode < 700) {
                // Snow
                bgElement.classList.add(
                    "bg-gradient-to-br",
                    "from-blue-100",
                    "to-blue-300"
                );
                this.createSnowflakes();
            } else if (weatherCode === 800) {
                // Clear
                const isDay = new Date().getHours() > 6 && new Date().getHours() < 20;
                if (isDay) {
                    bgElement.classList.add(
                        "bg-gradient-to-br",
                        "from-blue-400",
                        "to-purple-600"
                    );
                } else {
                    bgElement.classList.add(
                        "bg-gradient-to-br",
                        "from-blue-900",
                        "to-purple-900"
                    );
                }
            } else {
                // Clouds/other
                bgElement.classList.add(
                    "bg-gradient-to-br",
                    "from-gray-400",
                    "to-gray-600"
                );
            }

            this.elements.weatherEffects.appendChild(bgElement);

            // Rain effect
            if (weatherCode >= 500 && weatherCode < 600) {
                this.elements.weatherEffects.classList.add("rain-effect");
            } else {
                this.elements.weatherEffects.classList.remove("rain-effect");
            }
        },

        createSnowflakes: function () {
            const snowflakeCount = 50;

            for (let i = 0; i < snowflakeCount; i++) {
                const snowflake = document.createElement("div");
                snowflake.classList.add("snowflake");

                // Random size between 2px and 8px
                const size = Math.random() * 6 + 2;
                snowflake.style.width = `${size}px`;
                snowflake.style.height = `${size}px`;

                // Random opacity
                snowflake.style.opacity = Math.random() * 0.7 + 0.3;

                // Random starting position
                snowflake.style.left = `${Math.random() * 100}vw`;

                // Random animation duration (5-15s)
                const duration = Math.random() * 10 + 5;
                snowflake.style.animationDuration = `${duration}s`;

                // Random delay
                snowflake.style.animationDelay = `${Math.random() * 5}s`;

                this.elements.weatherEffects.appendChild(snowflake);
            }
        },

        showLoadingState: function () {
            this.elements.loadingSkeleton.classList.remove("hidden");
            this.elements.weatherContent.classList.add("hidden");
            this.elements.weatherInsights.classList.add("hidden");

            // Show loading animation on location button
            this.elements.locationBtn.innerHTML =
                '<i class="fas fa-circle-notch fa-spin"></i>';
        },

        showErrorState: function (message) {
            this.elements.loadingSkeleton.classList.add("hidden");
            this.elements.weatherContent.classList.add("hidden");

            // Reset location button
            this.elements.locationBtn.innerHTML =
                '<i class="fas fa-location-arrow"></i>';

            // Show error message
            const errorElement = document.createElement("div");
            errorElement.className = "text-center py-8";
            errorElement.innerHTML = `
                        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                        <p class="text-lg">${message}</p>
                        <button class="mt-4 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
                            Try Again
                        </button>
                    `;

            // Replace main card content
            this.elements.mainCard.innerHTML = "";
            this.elements.mainCard.appendChild(errorElement);

            // Add event listener to try again button
            const tryAgainBtn = errorElement.querySelector("button");
            tryAgainBtn.addEventListener("click", () => {
                this.getUserLocation();
            });
        },
    };

    // Initialize the app
    WeatherApp.init();
});
