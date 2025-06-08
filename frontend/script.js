const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Your Flask backend URL

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('areaSearchInput');
    const searchButton = document.getElementById('searchButton');
    const statusDisplay = document.getElementById('statusDisplay');
    const knownAreasList = document.getElementById('knownAreasList');

    // Function to fetch and display status for a specific area
    async function fetchAreaStatus(areaName) {
        console.log("Attempting to fetch status for area:", areaName); // DEBUG LOG
        try {
            statusDisplay.innerHTML = `<p>Loading status for ${areaName}...</p>`;
            const response = await fetch(`${API_BASE_URL}/areas/${areaName.toLowerCase()}`); // Added .toLowerCase() here for consistency
            if (!response.ok) {
                if (response.status === 404) {
                    statusDisplay.innerHTML = `<p class="status-outage">Area "${areaName}" not found or no status available.</p>`;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }
            const data = await response.json();
            renderAreaStatus(data);
        } catch (error) {
            console.error('Error fetching area status:', error);
            statusDisplay.innerHTML = `<p class="status-outage">Failed to fetch status. Please try again.</p>`;
        }
    }

    // Function to render area status
    function renderAreaStatus(area) {
        let statusClass = '';
        if (area.status.toLowerCase().includes('outage')) {
            statusClass = 'status-outage';
        } else if (area.status.toLowerCase().includes('low pressure')) {
            statusClass = 'status-low-pressure';
        } else {
            statusClass = 'status-normal';
        }

        statusDisplay.className = `status-display ${statusClass}`; // Update class for styling
        statusDisplay.innerHTML = `
            <h3>${area.name}</h3>
            <p><strong>Status:</strong> ${area.status}</p>
            <p><strong>Details:</strong> ${area.details}</p>
            <p><strong>Estimated Restoration:</strong> ${area.eta}</p>
        `;
    }

    // Event Listener for Search Button
    searchButton.addEventListener('click', () => {
        const areaName = searchInput.value.trim();
        if (areaName) {
            fetchAreaStatus(areaName);
        } else {
            statusDisplay.innerHTML = `<p>Please enter an area name to search.</p>`;
        }
    });

    // Event Listener for Enter key in search input
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });

    // --- Load Known Areas ---
    async function loadKnownAreas() {
        try {
            const response = await fetch(`${API_BASE_URL}/areas`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const areas = await response.json();
            knownAreasList.innerHTML = ''; // Clear loading message
            if (areas.length === 0) {
                knownAreasList.innerHTML = '<p>No areas found.</p>';
                return;
            }
            areas.forEach(area => {
                const areaDiv = document.createElement('div');
                areaDiv.innerHTML = `<strong>${area.name}:</strong> ${area.status}`;
                areaDiv.addEventListener('click', () => {
                    searchInput.value = area.name; 
                    fetchAreaStatus(area.name); 
                });
                knownAreasList.appendChild(areaDiv);
            });
        } catch (error) {
            console.error('Error loading known areas:', error);
            knownAreasList.innerHTML = '<p>Failed to load known areas.</p>';
        }
    }

    loadKnownAreas(); 

    const adminSectionHtml = `
        <div class="admin-section">
            <h2>Admin Panel (PoC Only)</h2>
            <input type="text" id="adminAreaName" placeholder="Area Name to Update">
            <select id="adminStatus">
                <option value="Normal">Normal</option>
                <option value="Outage">Outage</option>
                <option value="Low Pressure">Low Pressure</option>
            </select>
            <input type="text" id="adminDetails" placeholder="Details (e.g., Planned Maintenance)">
            <input type="text" id="adminETA" placeholder="ETA (e.g., 6 PM today)">
            <button id="updateStatusButton">Update Status</button>
            <p id="adminMessage"></p>
        </div>
    `;
    document.querySelector('.container').insertAdjacentHTML('beforeend', adminSectionHtml);

    const adminAreaNameInput = document.getElementById('adminAreaName');
    const adminStatusSelect = document.getElementById('adminStatus');
    const adminDetailsInput = document.getElementById('adminDetails');
    const adminETAInput = document.getElementById('adminETA');
    const updateStatusButton = document.getElementById('updateStatusButton');
    const adminMessage = document.getElementById('adminMessage');

    updateStatusButton.addEventListener('click', async () => {
        const areaName = adminAreaNameInput.value.trim();
        const status = adminStatusSelect.value;
        const details = adminDetailsInput.value.trim();
        const eta = adminETAInput.value.trim();

        if (!areaName) {
            adminMessage.textContent = "Please enter an area name to update.";
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/admin/areas/${areaName.toLowerCase()}`, { 
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Key': 'YOUR_SECRET_ADMIN_KEY' 
                },
                body: JSON.stringify({ status, details, eta })
            });

            const result = await response.json();
            if (response.ok) {
                adminMessage.textContent = `Success: ${result.message}`;
                adminMessage.style.color = 'green';
                loadKnownAreas(); 
            } else {
                adminMessage.textContent = `Error: ${result.error || response.statusText}`;
                adminMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Error updating status:', error);
            adminMessage.textContent = 'An error occurred during update.';
            adminMessage.style.color = 'red';
        }
    });
});