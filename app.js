class YouTubeLyricsSync {
    constructor() {
        this.player = null;
        this.playerReady = false;
        this.lyrics = [];
        this.currentLyricIndex = -1;
        this.isPlaying = false;
        this.updateInterval = null;
    }

    async parseLRC() {
        try {
            const response = await fetch('lyrics.lrc');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const lrcData = await response.text();
            console.log('LRC data loaded:', lrcData); // Debug log
            const lines = lrcData.trim().split('\n');
        
            this.lyrics = lines.map(line => {
                const match = line.match(/\[(\d{1,2}):(\d{2})\.(\d{2,3})\](.*)/);
                if (match) {

                    const [, minutes, seconds, centiseconds, text] = match;
                    const timeInSeconds = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(centiseconds) / 1000;
                    console.log(timeInSeconds , text)
                    return {
                        time: timeInSeconds,
                        text: text.trim()
                    };
                }
                return null;
            }).filter(lyric => lyric !== null);

            console.log('Parsed lyrics:', this.lyrics); // Debug log
            this.renderLyrics();
        } catch (error) {
            console.error('Error loading LRC file:', error);
            document.getElementById('lyrics-container').innerHTML = '<div class="lyrics-loading">Error loading lyrics file</div>';
        }
    }

    renderLyrics() {
        const container = document.getElementById('lyrics-container');
        if (!container) {
            console.error('Lyrics container not found');
            return;
        }
        
        container.innerHTML = '';

        if (this.lyrics.length === 0) {
            container.innerHTML = '<div class="lyrics-loading">No lyrics found</div>';
            return;
        }

        this.lyrics.forEach((lyric, index) => {
            const lyricElement = document.createElement('div');
            lyricElement.className = 'lyric-line future';
            lyricElement.textContent = lyric.text;
            lyricElement.dataset.index = index;
            lyricElement.addEventListener('click', () => this.seekToLyric(index));
            container.appendChild(lyricElement);
        });
    }

    initializePlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: 'DBf5_k40EKM', // Rick Astley - Never Gonna Give You Up (for demonstration)
            playerVars: {
                autoplay: 0,
                controls: 1,
                disablekb: 0,
                enablejsapi: 1,
                fs: 1,
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                showinfo: 0
            },
            events: {
                onReady: (event) => this.onPlayerReady(event),
                onStateChange: (event) => this.onPlayerStateChange(event)
            }
        });
    }

    onPlayerReady(event) {
        console.log('YouTube player ready');
        this.playerReady = true;
        this.updateDuration();
        this.startSyncLoop();
    }

    onPlayerStateChange(event) {
        const playBtn = document.getElementById('play-btn');
        const playIcon = playBtn.querySelector('.play-icon');
        const pauseIcon = playBtn.querySelector('.pause-icon');
        const btnText = playBtn.querySelector('.btn-text');

        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'inline';
            btnText.textContent = 'Pause';
            this.startSyncLoop();
        } else {
            this.isPlaying = false;
            playIcon.style.display = 'inline';
            pauseIcon.style.display = 'none';
            btnText.textContent = 'Play';
            this.stopSyncLoop();
        }
    }

    setupEventListeners() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');

        playBtn.addEventListener('click', () => {
            if (this.player && this.playerReady) {
                if (this.isPlaying) {
                    this.player.pauseVideo();
                } else {
                    this.player.playVideo();
                }
            }
        });

        pauseBtn.addEventListener('click', () => {
            if (this.player && this.playerReady) {
                this.player.pauseVideo();
            }
        });
    }

    startSyncLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            if (this.player && this.isPlaying) {
                this.updateCurrentTime();
                this.syncLyrics();
            }
        }, 100); // Update every 100ms for smooth sync
    }

    stopSyncLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    updateCurrentTime() {
        if (!this.player) return;

        const currentTime = this.player.getCurrentTime();
        const duration = this.player.getDuration();
        
        document.getElementById('current-time').textContent = this.formatTime(currentTime);
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    updateDuration() {
        if (!this.player) return;
        
        const duration = this.player.getDuration();
        console.log(duration)
        document.getElementById('duration').textContent = this.formatTime(duration);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    syncLyrics() {
        if (!this.player || this.lyrics.length === 0) return;

        const currentTime = this.player.getCurrentTime();
        let newCurrentIndex = -1;

        // Find the current lyric based on time
        for (let i = this.lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= this.lyrics[i].time) {
                newCurrentIndex = i;
                break;
            }
        }

        // Update lyrics highlighting if the current lyric changed
        if (newCurrentIndex !== this.currentLyricIndex) {
            this.updateLyricHighlighting(newCurrentIndex, currentTime);
            this.currentLyricIndex = newCurrentIndex;
        }
    }

    updateLyricHighlighting(currentIndex, currentTime) {
        const lyricElements = document.querySelectorAll('.lyric-line');
        
        lyricElements.forEach((element, index) => {
            element.classList.remove('active', 'past', 'future');
            
            if (index === currentIndex) {
                element.classList.add('active');
                this.scrollToActiveLyric(element);
            } else if (index < currentIndex) {
                element.classList.add('past');
            } else {
                element.classList.add('future');
            }
        });
    }

    scrollToActiveLyric(element) {
        const container = document.getElementById('lyrics-container');
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Check if element is outside the visible area
        if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    seekToLyric(index) {
        if (this.player && this.lyrics[index]) {
            const targetTime = this.lyrics[index].time;
            this.player.seekTo(targetTime, true);
            this.currentLyricIndex = index;
            this.updateLyricHighlighting(index, targetTime);
        }
    }
}

// Global function for YouTube API - called when YouTube API is ready
window.onYouTubeIframeAPIReady = function() {
    const app = new YouTubeLyricsSync();
    app.parseLRC(); // Now async, but we don't need to await here
    app.setupEventListeners();
    app.initializePlayer();
};