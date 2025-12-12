/**
 * GLITCH ART GALLERY - INTERACTIVE PUZZLES
 *
 * This JavaScript file handles:
 * - Opening and closing puzzle modals
 * - Focus trapping and accessibility
 * - Puzzle logic for Vim, Python, and Ruby on Rails
 * - Attempt tracking and hints
 * - Sound synthesis with Web Audio API
 * - Keyboard interactions
 *
 * DEV NOTE: Set DEV_SAFE_CLOSE to true during development to allow Esc key to close modals
 */

;(() => {
  /* ===== CONFIGURATION ===== */
  const DEV_SAFE_CLOSE = true // Set to false in production to enforce puzzle solving

  /* ===== STATE MANAGEMENT ===== */
  const state = {
    currentModal: null,
    attempts: {
      vim: 0,
      python: 0,
      rails: 0,
    },
    previousFocus: null,
    zenRevealed: false,
    chainPulling: false,
    chainHoldTimer: null,
  }

  /* ===== AUDIO SYNTHESIS ===== */
  // TODO: Replace these synthesized sounds with actual audio files in assets/ folder
  const AudioEngine = {
    context: null,

    init() {
      try {
        this.context = new (window.AudioContext || window.webkitAudioContext)()
      } catch (e) {
        console.warn("[v0] Web Audio API not supported")
      }
    },

    playSuccess() {
      if (!this.context) return
      const osc = this.context.createOscillator()
      const gain = this.context.createGain()

      osc.connect(gain)
      gain.connect(this.context.destination)

      osc.frequency.setValueAtTime(523.25, this.context.currentTime) // C5
      osc.frequency.setValueAtTime(659.25, this.context.currentTime + 0.1) // E5
      osc.frequency.setValueAtTime(783.99, this.context.currentTime + 0.2) // G5

      gain.gain.setValueAtTime(0.3, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3)

      osc.start(this.context.currentTime)
      osc.stop(this.context.currentTime + 0.3)
    },

    playError() {
      if (!this.context) return
      const osc = this.context.createOscillator()
      const gain = this.context.createGain()

      osc.connect(gain)
      gain.connect(this.context.destination)

      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(200, this.context.currentTime)
      osc.frequency.setValueAtTime(100, this.context.currentTime + 0.1)

      gain.gain.setValueAtTime(0.2, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15)

      osc.start(this.context.currentTime)
      osc.stop(this.context.currentTime + 0.15)
    },

    playHiss() {
      if (!this.context) return
      const bufferSize = this.context.sampleRate * 0.5
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = this.context.createBufferSource()
      const filter = this.context.createBiquadFilter()
      const gain = this.context.createGain()

      noise.buffer = buffer
      filter.type = "highpass"
      filter.frequency.value = 2000

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.context.destination)

      gain.gain.setValueAtTime(0.15, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4)

      noise.start(this.context.currentTime)
      noise.stop(this.context.currentTime + 0.5)
    },

    playHorn() {
      if (!this.context) return
      const osc = this.context.createOscillator()
      const gain = this.context.createGain()

      osc.connect(gain)
      gain.connect(this.context.destination)

      osc.type = "square"
      osc.frequency.setValueAtTime(220, this.context.currentTime)
      osc.frequency.setValueAtTime(180, this.context.currentTime + 0.15)

      gain.gain.setValueAtTime(0.25, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3)

      osc.start(this.context.currentTime)
      osc.stop(this.context.currentTime + 0.3)
    },
  }

  /* ===== MODAL MANAGEMENT ===== */
  const ModalManager = {
    open(modalId) {
      const modal = document.getElementById(`${modalId}-modal`)
      if (!modal) return

      // Store previous focus for restoration
      state.previousFocus = document.activeElement

      // Show modal
      modal.removeAttribute("hidden")
      modal.classList.remove("modal-closing")

      // Prevent background scrolling
      document.body.classList.add("modal-open")

      // Set aria-hidden on main content
      document.querySelector("main").setAttribute("aria-hidden", "true")

      // Focus first input
      const firstInput = modal.querySelector("input")
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100)
      }

      // Store current modal
      state.currentModal = modalId

      // Setup focus trap
      this.setupFocusTrap(modal)

      console.log(`[v0] Opened ${modalId} modal`)
    },

    close(modalId, success = false) {
      const modal = document.getElementById(`${modalId}-modal`)
      if (!modal) return

      // Play appropriate sound
      if (success) {
        AudioEngine.playSuccess()
      }

      // Add closing animation
      modal.classList.add("modal-closing")

      // Wait for animation, then hide
      setTimeout(() => {
        modal.setAttribute("hidden", "")
        modal.classList.remove("modal-closing")

        // Restore main content accessibility
        document.querySelector("main").removeAttribute("aria-hidden")

        // Restore body scrolling
        document.body.classList.remove("modal-open")

        // Restore focus
        if (state.previousFocus) {
          state.previousFocus.focus()
        }

        // Reset modal-specific state
        this.resetModal(modalId)

        state.currentModal = null

        console.log(`[v0] Closed ${modalId} modal`)
      }, 500)
    },

    setupFocusTrap(modal) {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      const handleTab = (e) => {
        if (e.key !== "Tab") return

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }

      modal.addEventListener("keydown", handleTab)
    },

    resetModal(modalId) {
      const modal = document.getElementById(`${modalId}-modal`)

      // Clear inputs
      const input = modal.querySelector("input")
      if (input) input.value = ""

      // Clear output areas
      const output = modal.querySelector(".terminal-output, .console-output")
      if (output && modalId === "vim") {
        output.innerHTML = `
                    <p class="terminal-line">~ Welcome to VIM ~</p>
                    <p class="terminal-line">~ Type a command to exit ~</p>
                    <p class="terminal-line">~</p>
                `
      } else if (output && modalId === "python") {
        output.innerHTML = `
                    <p class="console-line">Python 3.11.0 (main, Oct 24 2022, 18:26:48)</p>
                    <p class="console-line">Type commands to interact with the serpent...</p>
                    <p class="console-line">&gt;&gt;&gt;</p>
                `
      }

      // Clear hints
      const hintArea = modal.querySelector(".hint-area")
      if (hintArea) hintArea.textContent = ""

      // Reset attempt counter
      state.attempts[modalId] = 0
      state.zenRevealed = false
    },
  }

  /* ===== VIM PUZZLE ===== */
  const VimPuzzle = {
    validCommands: ["q", "q!", "wq", ":q", ":q!", ":wq"],

    init() {
      const input = document.getElementById("vim-input")
      if (!input) return

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleCommand(input.value.trim())
          input.value = ""
        }

        // Handle CTRL+[ (common Vim escape)
        if (e.ctrlKey && e.key === "[") {
          e.preventDefault()
          this.showHint("HINT: You're on the right track, but try typing a command starting with :")
        }
      })
    },

    handleCommand(command) {
      const output = document.querySelector("#vim-modal .terminal-output")
      const modal = document.getElementById("vim-modal")

      // Check if valid exit command
      if (this.validCommands.includes(command.toLowerCase())) {
        const line = document.createElement("p")
        line.className = "terminal-line"
        line.textContent = `:${command}`
        output.appendChild(line)

        const successLine = document.createElement("p")
        successLine.className = "terminal-line"
        successLine.textContent = "~ Exiting VIM... Success! ~"
        successLine.style.color = "#00ff00"
        output.appendChild(successLine)

        modal.classList.add("success-effect")

        setTimeout(() => {
          ModalManager.close("vim", true)
        }, 800)
        return
      }

      // Wrong command
      state.attempts.vim++
      AudioEngine.playError()
      modal.classList.add("error-glitch")
      setTimeout(() => modal.classList.remove("error-glitch"), 300)

      const line = document.createElement("p")
      line.className = "terminal-line"
      line.textContent = command ? `:${command}` : ":"
      output.appendChild(line)

      const errorLine = document.createElement("p")
      errorLine.className = "terminal-line"
      errorLine.style.color = "#ff0000"
      errorLine.textContent = "E37: No write since last change (add ! to override)"
      output.appendChild(errorLine)

      // Show hint after 3 attempts
      if (state.attempts.vim >= 3) {
        this.showHint("HINT: Try a VIM command to exit (:q, :q!, or :wq)")
      }

      // Scroll to bottom
      output.scrollTop = output.scrollHeight
    },

    showHint(message) {
      const hintArea = document.querySelector("#vim-modal .hint-area")
      hintArea.textContent = message
    },
  }

  /* ===== PYTHON PUZZLE ===== */
  const PythonPuzzle = {
    validExitCommands: ["exit()", "quit()"],

    init() {
      const input = document.getElementById("python-input")
      if (!input) return

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleCommand(input.value.trim())
          input.value = ""
        }
      })

      // Optional: Enable snake mini-game on mobile
      if (window.innerWidth < 768) {
        this.initMiniGame()
      }
    },

    handleCommand(command) {
      const output = document.querySelector("#python-modal .console-output")
      const modal = document.getElementById("python-modal")

      const line = document.createElement("p")
      line.className = "console-line"
      line.textContent = `>>> ${command}`
      output.appendChild(line)

      // Check for import this
      if (command === "import this") {
        const zenLine1 = document.createElement("p")
        zenLine1.className = "console-line"
        zenLine1.textContent = "The Zen of Python, by Tim Peters"
        output.appendChild(zenLine1)

        const zenLine2 = document.createElement("p")
        zenLine2.className = "console-line"
        zenLine2.textContent = "Beautiful is better than ugly."
        output.appendChild(zenLine2)

        const hintLine = document.createElement("p")
        hintLine.className = "console-line"
        hintLine.style.color = "#ffeb3b"
        hintLine.textContent = ">>> HINT: Use exit() or quit() to leave"
        output.appendChild(hintLine)

        state.zenRevealed = true
        output.scrollTop = output.scrollHeight
        return
      }

      // Check if valid exit command
      if (this.validExitCommands.includes(command)) {
        const successLine = document.createElement("p")
        successLine.className = "console-line"
        successLine.style.color = "#00ff00"
        successLine.textContent = ">>> Exiting Python... Goodbye!"
        output.appendChild(successLine)

        modal.classList.add("success-effect")

        setTimeout(() => {
          ModalManager.close("python", true)
        }, 800)
        return
      }

      // Wrong command
      state.attempts.python++
      AudioEngine.playHiss()
      modal.classList.add("error-glitch")
      setTimeout(() => modal.classList.remove("error-glitch"), 300)

      const errorLine = document.createElement("p")
      errorLine.className = "console-line"
      errorLine.style.color = "#ff0000"
      errorLine.textContent = "Traceback (most recent call last):"
      output.appendChild(errorLine)

      const errorLine2 = document.createElement("p")
      errorLine2.className = "console-line"
      errorLine2.style.color = "#ff0000"
      errorLine2.textContent = `SnakesAreSassyError: you woke the serpent with "${command}"`
      output.appendChild(errorLine2)

      // Show hint after 4 attempts
      if (state.attempts.python >= 4) {
        this.showHint("HINT: Python has exit() and quit() commands")
      }

      output.scrollTop = output.scrollHeight
    },

    showHint(message) {
      const hintArea = document.querySelector("#python-modal .hint-area")
      hintArea.textContent = message
    },

    initMiniGame() {
      // Mini-game implementation for mobile
      const game = document.querySelector("#python-modal .snake-game")
      if (!game) return

      const tapTarget = game.querySelector(".snake-tap-target")
      const tapCountSpan = game.querySelector(".tap-count span")
      let taps = 0

      tapTarget.addEventListener("click", () => {
        taps++
        tapCountSpan.textContent = taps

        if (taps >= 5) {
          this.showHint("Mini-game complete! Try typing exit() to escape")
          game.setAttribute("hidden", "")
        }
      })
    },
  }

  /* ===== RUBY ON RAILS PUZZLE ===== */
  const RailsPuzzle = {
    validCommands: ["salary - 6500"],

    init() {
      const input = document.getElementById("rails-input")
      if (!input) return

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.handleCommand(input.value.trim())
          input.value = ""
        }
      })

      // Setup drag and drop for chain
      this.setupChainInteraction()
    },

    handleCommand(command) {
      const modal = document.getElementById("rails-modal")

      // Check if valid command
      if (this.validCommands.includes(command)) {
        this.successfulPull()
        return
      }

      // Wrong command
      state.attempts.rails++
      AudioEngine.playHorn()
      modal.classList.add("error-glitch")
      setTimeout(() => modal.classList.remove("error-glitch"), 300)

      // Show hint after 3 attempts
      if (state.attempts.rails >= 3) {
        this.showHint("Hint (नेपाली): चेन तान्नुहोस् — Pull the chain to stop the train.")
      }
    },

    setupChainInteraction() {
      const chain = document.querySelector(".pull-chain")
      const lever = document.querySelector(".emergency-lever")
      const modal = document.getElementById("rails-modal")

      if (!chain || !lever) return

      // Drag and drop
      chain.addEventListener("dragstart", (e) => {
        e.dataTransfer.effectAllowed = "move"
        chain.style.opacity = "0.5"
      })

      chain.addEventListener("dragend", () => {
        chain.style.opacity = "1"
      })

      lever.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        lever.style.transform = "scale(1.1)"
      })

      lever.addEventListener("dragleave", () => {
        lever.style.transform = "scale(1)"
      })

      lever.addEventListener("drop", (e) => {
        e.preventDefault()
        lever.style.transform = "scale(1)"
        // this.successfulPull()
      })

      // Click and hold alternative
      chain.addEventListener("mousedown", () => {
        state.chainHoldTimer = setTimeout(() => {
          this.successfulPull()
        }, 1500)
      })

      chain.addEventListener("mouseup", () => {
        if (state.chainHoldTimer) {
          clearTimeout(state.chainHoldTimer)
          state.chainHoldTimer = null
        }
      })

      chain.addEventListener("mouseleave", () => {
        if (state.chainHoldTimer) {
          clearTimeout(state.chainHoldTimer)
          state.chainHoldTimer = null
        }
      })

      // Keyboard accessibility
      chain.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          this.successfulPull()
        }
      })

      // Wrong interactions (clicking diamond)
      const diamond = document.querySelector(".diamond")
      if (diamond) {
        diamond.addEventListener("click", () => {
          state.attempts.rails++
          AudioEngine.playHorn()
          modal.classList.add("error-glitch")
          setTimeout(() => modal.classList.remove("error-glitch"), 300)

          diamond.style.animation = "none"
          setTimeout(() => {
            diamond.style.animation = "sparkle 2s infinite"
          }, 10)

          if (state.attempts.rails >= 3) {
            this.showHint("Hint (नेपाली): चेन तान्नुहोस् — Pull the chain to stop the train.")
          }
        })
      }
    },
  
    successfulPull() {
      const modal = document.getElementById("rails-modal")
      const train = document.querySelector(".train-animation")

      modal.classList.add("success-effect")

    //   // Stop the train animation
    //   if (train) {
    //     train.style.animationPlayState = "paused"
    //   }

      setTimeout(() => {
        ModalManager.close("rails", true)
      }, 800)
    },

    showHint(message) {
      const hintArea = document.querySelector("#rails-modal .hint-area")
      hintArea.textContent = message
    },
  }

  /* ===== KEYBOARD SHORTCUTS ===== */
  const KeyboardHandler = {
    init() {
      document.addEventListener("keydown", (e) => {
        // ESC key handling
        if (e.key === "Escape" && state.currentModal) {
          if (DEV_SAFE_CLOSE) {
            console.log("[v0] DEV_SAFE_CLOSE enabled - closing modal with ESC")
            ModalManager.close(state.currentModal)
          } else {
            console.log("[v0] ESC pressed but puzzle must be solved")
            // Could add a visual indicator that ESC doesn't work
          }
        }
      })
    },
  }

  /* ===== INITIALIZATION ===== */
  function init() {
    console.log("[v0] Initializing Glitch Art Gallery")

    // Initialize audio engine
    AudioEngine.init()

    // Initialize keyboard handling
    KeyboardHandler.init()

    // Initialize puzzles
    VimPuzzle.init()
    PythonPuzzle.init()
    RailsPuzzle.init()

    // Setup card click handlers
    const tryButtons = document.querySelectorAll(".try-btn")
    tryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target")
        ModalManager.open(target)
      })
    })

    // Make cards clickable
    const cards = document.querySelectorAll(".meme-card")
    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("try-btn")) return
        const cardType = card.getAttribute("data-card")
        ModalManager.open(cardType)
      })
    })

    console.log("[v0] Gallery initialized successfully")
    console.log(`[v0] DEV_SAFE_CLOSE is ${DEV_SAFE_CLOSE ? "ENABLED" : "DISABLED"}`)
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
