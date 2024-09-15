const modal = document.getElementById("myModal");
function openModal() {
    modal.style.display = "block";
    setTimeout(() => {
        modal.style.opacity = 1;
    }, 100);
}

function closeModal() {
    modal.style.opacity = 0;
    setTimeout(() => {
        modal.style.display = "none";
    }, 500);
}

window.onclick = function(event) {
    if (event.target === modal) {
        closeModal()
    }
}
function createRoom() {
    const roomName = document.getElementById('newRoomName').value;
    if (roomName) {
        window.location.href = `room?room=${encodeURIComponent(roomName)}`;
    }
}