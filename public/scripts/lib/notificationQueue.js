class NotificationQueue {
  constructor() {
    this.notifications = [];
  }
  queue(swalNoti) {
    this.notifications.push(swalNoti);
    if (this.notifications.length == 1) this.#display(this.notifications[0]);
  }

  #display(notiOptions) {
    if (!notiOptions) return;
    swal.fire(notiOptions).then(result => {
      if (notiOptions?.type == 'discord_auth') {
        if (result.isConfirmed) document.location = window.DISCORD_OAUTH2_URI;
      } else if (notiOptions?.type == 'join_room') {
        if (result.isConfirmed) {
          let roomCode = document.getElementById('roomCode').value;
          localStorage.setItem('room_code', roomCode);
          wsManager.sendMessage({
            type: MessageTypes.ROOM_JOIN,
            id: localStorage.getItem('discord_id'),
            roomId: roomCode,
          });
        }
      } else if (notiOptions?.type == 'first_visit') {
        if (result.isConfirmed) localStorage.setItem('firstTimeVisit', 'true');
      } else if (notiOptions?.type == 'error') {
        if (result.isConfirmed) location.reload();
      } else if (notiOptions?.type == 'auth_error') {
        if (result.isConfirmed) {
          window.onbeforeunload = () => {};
          window.onunload = () => {};
          document.location = window.DISCORD_OAUTH2_URI;
        }
      }
      this.notifications.shift();
      if (this.notifications.length) {
        this.#display(this.notifications[0]);
      }
    });
  }
}

const notificationQueue = new NotificationQueue();
