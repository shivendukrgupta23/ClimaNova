const apiKey = "11709d949fe74863643486a6cc63ce4c";
const weatherApiUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric&q=";
const forecastApiUrl = "https://api.openweathermap.org/data/2.5/forecast?units=metric&q=";
const geocodingApiUrl = "https://api.openweathermap.org/geo/1.0/reverse?";

const searchBox = document.querySelector(".city-input");
const dateInput = document.querySelector(".date-input");
const searchBtn = document.querySelector(".search-btn");
const weatherIcon = document.querySelector(".weather-icon");
const weatherDiv = document.querySelector(".weather");
const errorDiv = document.querySelector(".error");
const forecastContainer = document.querySelector(".forecast-container");
const voiceSearchBtn = document.getElementById("voiceSearchBtn");
const favoritesPanel = document.querySelector(".favorites-panel");
const favoritesList = document.getElementById("favoritesList");
const showFavoritesBtn = document.getElementById("showFavoritesBtn");
const closeFavoritesBtn = document.getElementById("closeFavorites");

// Additional feature buttons
const shareBtn = document.getElementById("shareBtn");
const locationBtn = document.getElementById("locationBtn");
const favBtn = document.getElementById("favBtn");

// Speech synthesis and recognition
const synth = window.speechSynthesis;
let recognition = null;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.lang = 'en-US';
}

// Set min date to today and max date to 15 days from now
const today = new Date();
const maxDate = new Date();
maxDate.setDate(today.getDate() + 14);

dateInput.min = today.toISOString().split('T')[0];
dateInput.max = maxDate.toISOString().split('T')[0];
dateInput.value = today.toISOString().split('T')[0];

// Load favorites from localStorage
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
updateFavoritesList();

// Add these constants at the top with your other constants
const showNotificationBtn = document.getElementById("showNotificationBtn");
const notificationModal = document.querySelector(".notification-modal");
const closeNotificationModal = document.getElementById("closeNotificationModal");
const saveNotificationsBtn = document.getElementById("saveNotifications");
const notificationTypeSelect = document.getElementById("notificationType");
const notificationTimeInput = document.getElementById("notificationTime");
const notificationFrequencySelect = document.getElementById("notificationFrequency");
const activeNotificationsList = document.getElementById("activeNotificationsList");
const aiSuggestion = document.querySelector(".ai-suggestion");

// Add this to your existing code
let notifications = JSON.parse(localStorage.getItem('weatherNotifications')) || [];
let lastWeatherConditions = null;

// AI Weather Assistant
class WeatherAI {
    constructor() {
        this.weatherPatterns = {};
    }

    analyzeWeather(weatherData) {
        const conditions = {
            temp: weatherData.main.temp,
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind.speed,
            weather: weatherData.weather[0].main,
            time: new Date().getHours()
        };

        this.updatePatterns(conditions);
        return this.generateSuggestions(conditions);
    }

    updatePatterns(conditions) {
        const hour = conditions.time;
        if (!this.weatherPatterns[hour]) {
            this.weatherPatterns[hour] = [];
        }
        this.weatherPatterns[hour].push(conditions);
        if (this.weatherPatterns[hour].length > 7) {
            this.weatherPatterns[hour].shift();
        }
    }

    generateSuggestions(current) {
        let suggestions = [];

        // Temperature-based suggestions
        if (current.temp > 30) {
            suggestions.push("High temperature detected. Recommended to set alerts for heat warnings.");
        } else if (current.temp < 5) {
            suggestions.push("Low temperature detected. Consider frost alerts.");
        }

        // Rain prediction
        if (current.humidity > 70 && current.weather.includes("Cloud")) {
            suggestions.push("High humidity with cloud cover suggests potential rain. Setting up rain alerts is recommended.");
        }

        // Wind alerts
        if (current.windSpeed > 20) {
            suggestions.push("Strong winds detected. Wind alerts recommended.");
        }

        // Time-based suggestions
        const hour = current.time;
        if (hour >= 6 && hour <= 9) {
            suggestions.push("Morning weather updates recommended for daily planning.");
        } else if (hour >= 17 && hour <= 20) {
            suggestions.push("Evening weather updates recommended for next-day preparation.");
        }

        return suggestions;
    }
}

const weatherAI = new WeatherAI();

// Notification System
function showNotificationModal() {
    notificationModal.style.display = 'flex';
    requestAnimationFrame(() => {
        notificationModal.classList.add('active');
        notificationModal.querySelector('.notification-content').style.transform = 'scale(1)';
    });
    updateAISuggestions();
}

function hideNotificationModal() {
    const content = notificationModal.querySelector('.notification-content');
    content.style.transform = 'scale(0.9)';
    notificationModal.classList.remove('active');
    setTimeout(() => {
        notificationModal.style.display = 'none';
        content.style.transform = 'scale(0.8)';
    }, 300);
}

function updateAISuggestions() {
    if (lastWeatherConditions) {
        const suggestions = weatherAI.analyzeWeather(lastWeatherConditions);
        aiSuggestion.innerHTML = `
            <strong>AI Suggestions:</strong><br>
            ${suggestions.map(s => `• ${s}`).join('<br>')}
        `;
    }
}

function saveNotification() {
    const types = Array.from(notificationTypeSelect.selectedOptions).map(option => option.value);
    const time = notificationTimeInput.value;
    const frequency = notificationFrequencySelect.value;

    if (types.length === 0 || !time) {
        showToast("Please select notification type and time", "error");
        return;
    }

    const notification = {
        id: Date.now(),
        types,
        time,
        frequency,
        active: true
    };

    notifications.push(notification);
    localStorage.setItem('weatherNotifications', JSON.stringify(notifications));
    updateNotificationsList();
    showToast("Weather alert saved successfully!", "success");
}

function updateNotificationsList() {
    activeNotificationsList.innerHTML = '';
    notifications.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item';
        notificationElement.innerHTML = `
            <div class="notification-info">
                <strong>${notification.types.join(', ')}</strong>
                <span>Time: ${notification.time}</span>
                <span>Frequency: ${notification.frequency}</span>
            </div>
            <div class="notification-actions">
                <button onclick="toggleNotification(${notification.id})">
                    <i class="fas fa-${notification.active ? 'bell' : 'bell-slash'}"></i>
                </button>
                <button class="delete-notification" onclick="deleteNotification(${notification.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        activeNotificationsList.appendChild(notificationElement);
    });
}

function toggleNotification(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
        notification.active = !notification.active;
        localStorage.setItem('weatherNotifications', JSON.stringify(notifications));
        updateNotificationsList();
        showToast(`Alert ${notification.active ? 'activated' : 'deactivated'}`, "info");
    }
}

function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    localStorage.setItem('weatherNotifications', JSON.stringify(notifications));
    updateNotificationsList();
    showToast("Alert deleted", "info");
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    const icon = type === 'error' ? 'exclamation-circle' : 
                type === 'success' ? 'check-circle' : 'info-circle';
    
    const color = type === 'error' ? '#ff5757' : 
                 type === 'success' ? '#4CAF50' : '#2196F3';
    
    toast.innerHTML = `
        <i class="fas fa-${icon}" style="color: ${color}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading() {
    const elements = document.querySelectorAll('.weather-main, .forecast-item, .detail-item');
    elements.forEach(el => el.classList.add('loading'));
}

function hideLoading() {
    const elements = document.querySelectorAll('.weather-main, .forecast-item, .detail-item');
    elements.forEach(el => el.classList.remove('loading'));
}

async function checkWeather(city, coords = null) {
    showLoading();
    try {
        let weatherUrl = weatherApiUrl;
        let forecastUrl = forecastApiUrl;

        if (coords) {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?units=metric&lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`;
        } else {
            weatherUrl += city + `&appid=${apiKey}`;
            forecastUrl += city + `&appid=${apiKey}`;
        }

        const [weatherResponse, forecastResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        if (weatherResponse.status === 404 || forecastResponse.status === 404) {
            showError("City not found. Please check the spelling and try again.");
            hideLoading();
            return;
        }

        const weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();

        // Add entrance animations by temporarily removing and re-adding elements
        weatherDiv.style.opacity = '0';
        
        // Update current weather
        updateCurrentWeather(weatherData);

        // Update forecast
        updateForecast(forecastData.list);

        // Update favorite button
        updateFavoriteButton(weatherData.name);

        // Speak weather information
        speakWeatherInfo(weatherData);

        // Check notifications
        checkNotificationTriggers(weatherData);

        // Show weather with animation
        weatherDiv.style.display = "block";
        setTimeout(() => {
            weatherDiv.style.opacity = '1';
            weatherDiv.style.transition = 'opacity 0.5s ease-out';
        }, 100);
        
        errorDiv.style.display = "none";

    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError("An error occurred. Please try again later.");
    } finally {
        hideLoading();
    }
}

function updateCurrentWeather(data) {
    const elements = {
        city: document.querySelector('.city'),
        temp: document.querySelector('.temp'),
        feelsLike: document.querySelector('.feels-like'),
        humidity: document.querySelector('.humidity'),
        wind: document.querySelector('.wind'),
        pressure: document.querySelector('.pressure'),
        visibility: document.querySelector('.visibility'),
        description: document.querySelector('.weather-description'),
        date: document.querySelector('.date')
    };

    // Apply fade out
    Object.values(elements).forEach(el => {
        if (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
        }
    });

    // Update values
    setTimeout(() => {
        elements.city.innerHTML = data.name;
        elements.temp.innerHTML = Math.round(data.main.temp) + "°c";
        elements.feelsLike.innerHTML = `Feels like: ${Math.round(data.main.feels_like)}°c`;
        elements.humidity.innerHTML = data.main.humidity + "%";
        elements.wind.innerHTML = data.wind.speed + " km/h";
        elements.pressure.innerHTML = data.main.pressure + " hPa";
        elements.visibility.innerHTML = (data.visibility / 1000) + " km";
        elements.description.innerHTML = data.weather[0].description.charAt(0).toUpperCase() + 
                                      data.weather[0].description.slice(1);
        elements.date.innerHTML = formatDate(new Date());

        // Apply fade in
        Object.values(elements).forEach((el, index) => {
            if (el) {
                setTimeout(() => {
                    el.style.transition = 'all 0.5s ease-out';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    }, 300);

    updateWeatherIcon(data.weather[0].main);
}

function updateWeatherIcon(weatherMain) {
    const iconMap = {
        'Clouds': 'clouds.png',
        'Clear': 'clear.png',
        'Rain': 'rain.png',
        'Drizzle': 'drizzle.png',
        'Mist': 'mist.png',
        'Snow': 'snow.png',
        'Thunderstorm': 'thunder.png'
    };

    weatherIcon.src = `images/${iconMap[weatherMain] || 'clear.png'}`;
    return iconMap[weatherMain] || 'clear.png';
}

function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function updateForecast(forecastList) {
    forecastContainer.innerHTML = '';
    const selectedDate = new Date(dateInput.value);
    
    // Group forecast by day
    const dailyForecasts = {};
    
    forecastList.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        const dateKey = forecastDate.toISOString().split('T')[0];
        
        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = forecast;
        }
    });

    // Create forecast items for the next 15 days
    for (let i = 0; i < 15; i++) {
        const date = new Date(selectedDate);
        date.setDate(selectedDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        const forecast = dailyForecasts[dateKey] || forecastList[0];
        
        forecastItem.innerHTML = `
            <div class="date">${formatDate(date)}</div>
            <img src="images/${updateWeatherIcon(forecast.weather[0].main)}" alt="Weather">
            <div class="temp">${Math.round(forecast.main.temp)}°c</div>
            <div class="details">
                <div>Humidity: ${forecast.main.humidity}%</div>
                <div>Wind: ${forecast.wind.speed} km/h</div>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    }
}

function showError(message) {
    errorDiv.querySelector('p').textContent = message;
    errorDiv.style.display = "block";
    weatherDiv.style.display = "none";
}

// Geolocation
async function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const coords = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };

            try {
                const response = await fetch(
                    `${geocodingApiUrl}lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}`
                );
                const data = await response.json();
                if (data[0]) {
                    searchBox.value = data[0].name;
                    checkWeather(null, coords);
                }
            } catch (error) {
                showError("Error getting location data");
            }
        }, () => {
            showError("Unable to get your location");
        });
    } else {
        showError("Geolocation is not supported by your browser");
    }
}

// Favorites functionality
function updateFavoriteButton(cityName) {
    const isFavorite = favorites.includes(cityName);
    favBtn.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}`;
    favBtn.style.background = isFavorite ? '#ff5757' : 'rgba(255, 255, 255, 0.1)';
}

function toggleFavorite() {
    const cityName = document.querySelector('.city').innerHTML;
    const index = favorites.indexOf(cityName);
    
    if (index === -1) {
        favorites.push(cityName);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    updateFavoriteButton(cityName);
}

// Share functionality
async function shareWeather() {
    const cityName = document.querySelector('.city').innerHTML;
    const temp = document.querySelector('.temp').innerHTML;
    const description = document.querySelector('.weather-description').innerHTML;
    
    const shareText = `Current weather in ${cityName}: ${temp} - ${description}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Weather Update',
                text: shareText,
                url: window.location.href
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        // Fallback copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Weather information copied to clipboard!');
        });
    }
}

// Voice Search Functions
function startVoiceSearch() {
    if (recognition) {
        recognition.start();
        voiceSearchBtn.classList.add('listening');
    } else {
        showError("Voice recognition is not supported in your browser");
    }
}

function speakWeatherInfo(data) {
    const text = `The current temperature in ${data.name} is ${Math.round(data.main.temp)} degrees Celsius with ${data.weather[0].description}`;
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
}

// Favorites Panel Functions
function toggleFavoritesPanel() {
    favoritesPanel.classList.toggle('active');
}

function updateFavoritesList() {
    favoritesList.innerHTML = '';
    favorites.forEach(city => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.innerHTML = `
            <span>${city}</span>
            <button class="remove-favorite" data-city="${city}">
                <i class="fas fa-times"></i>
            </button>
        `;
        favoriteItem.querySelector('span').addEventListener('click', () => {
            checkWeather(city);
            toggleFavoritesPanel();
        });
        favoriteItem.querySelector('.remove-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavorite(city);
        });
        favoritesList.appendChild(favoriteItem);
    });
}

function removeFavorite(city) {
    favorites = favorites.filter(fav => fav !== city);
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
    updateFavoritesList();
    updateFavoriteButton(document.querySelector('.city').innerHTML);
}

// Event Listeners
searchBtn.addEventListener("click", () => {
    if (searchBox.value) {
        checkWeather(searchBox.value);
    }
});

searchBox.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && searchBox.value) {
        checkWeather(searchBox.value);
    }
});

dateInput.addEventListener("change", () => {
    if (searchBox.value) {
    checkWeather(searchBox.value);
    }
});

locationBtn.addEventListener("click", getCurrentLocation);
shareBtn.addEventListener("click", shareWeather);
favBtn.addEventListener("click", toggleFavorite);

if (recognition) {
    recognition.onresult = (event) => {
        const city = event.results[0][0].transcript;
        searchBox.value = city;
        checkWeather(city);
    };

    recognition.onend = () => {
        voiceSearchBtn.classList.remove('listening');
    };
}

voiceSearchBtn.addEventListener("click", startVoiceSearch);
showFavoritesBtn.addEventListener("click", toggleFavoritesPanel);
closeFavoritesBtn.addEventListener("click", toggleFavoritesPanel);

// Event Listeners
showNotificationBtn.addEventListener('click', showNotificationModal);
closeNotificationModal.addEventListener('click', hideNotificationModal);
saveNotificationsBtn.addEventListener('click', saveNotification);

// Initialize with default city
checkWeather("Delhi");

// Initialize notifications list
updateNotificationsList();

function checkNotificationTriggers(weatherData) {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    notifications.forEach(notification => {
        if (!notification.active) return;

        const [notifHour, notifMinute] = notification.time.split(':').map(Number);
        
        if (currentHour === notifHour && currentMinute === notifMinute) {
            const triggers = [];

            notification.types.forEach(type => {
                switch (type) {
                    case 'rain':
                        if (weatherData.weather[0].main.includes('Rain')) {
                            triggers.push('Rain expected');
                        }
                        break;
                    case 'extreme':
                        if (weatherData.main.temp > 35 || weatherData.main.temp < 0) {
                            triggers.push('Extreme temperature');
                        }
                        break;
                    case 'temperature':
                        triggers.push(`Current temperature: ${Math.round(weatherData.main.temp)}°C`);
                        break;
                    case 'humidity':
                        if (weatherData.main.humidity > 70) {
                            triggers.push('High humidity');
                        }
                        break;
                    case 'wind':
                        if (weatherData.wind.speed > 20) {
                            triggers.push('Strong winds');
                        }
                        break;
                }
            });

            if (triggers.length > 0) {
                showWeatherNotification(triggers.join(', '), weatherData.name);
            }
        }
    });
}

function showWeatherNotification(message, city) {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(`Weather Alert - ${city}`, {
                    body: message,
                    icon: 'images/weather-icon.png'
                });
            }
        });
    }
    
    // Also show in-app notification
    showToast(message, 'info');
}




