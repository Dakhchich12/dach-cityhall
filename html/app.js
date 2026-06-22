let selectedIdentity = null
let selectedIdentityType = null
let selectedIdentityCost = null
let selectedJob = null
let selectedJobId = null

let audioCtx = null

function getAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      return null
    }
  }
  return audioCtx
}

/** Short synthetic UI sounds — no external audio files required */
function playSound(kind) {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === "suspended") ctx.resume()

  const now = ctx.currentTime
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.12, now)
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  master.connect(ctx.destination)

  const osc = ctx.createOscillator()
  osc.connect(master)

  switch (kind) {
    case "open":
      osc.type = "sine"
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)
      osc.start(now)
      osc.stop(now + 0.12)
      break
    case "close":
      osc.type = "sine"
      osc.frequency.setValueAtTime(660, now)
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.1)
      osc.start(now)
      osc.stop(now + 0.12)
      break
    case "nav":
      osc.type = "triangle"
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.setValueAtTime(550, now + 0.04)
      osc.start(now)
      osc.stop(now + 0.07)
      break
    case "select":
      osc.type = "square"
      osc.frequency.setValueAtTime(780, now)
      osc.start(now)
      osc.stop(now + 0.04)
      break
    case "success":
      osc.type = "sine"
      osc.frequency.setValueAtTime(523, now)
      osc.frequency.setValueAtTime(659, now + 0.06)
      osc.frequency.setValueAtTime(784, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.2)
      break
    case "click":
    default:
      osc.type = "sine"
      osc.frequency.setValueAtTime(620, now)
      osc.start(now)
      osc.stop(now + 0.035)
      break
  }
}

function setUiOpen(open) {
  const root = document.getElementById("ch-root")
  const overlay = document.getElementById("ch-overlay")
  if (overlay) overlay.style.display = open ? "block" : "none"
  if (root) root.classList.toggle("is-visible", open)
}

const jobDescriptions = {
  trucker: "Drive trucks and deliver goods across the city.",
  taxi: "Transport passengers to their destinations.",
  tow: "Assist in removing illegally parked or disabled vehicles.",
  reporter: "Gather and report news for the local media.",
  garbage: "Collect and dispose of waste to keep the city clean.",
  bus: "Operate public transportation buses on designated routes.",
  hotdog: "Run a hot dog stand and serve delicious street food.",
  telco: "Install and repair telecom lines and equipment.",
}

const SetJobs = (jobs) => {
  $(".job-page-blocks").empty()
  if (!jobs || typeof jobs !== "object") return
  $.each(jobs, (job, info) => {
    const description = jobDescriptions[job] || "No description available."
    const html = `
            <div class="job-page-block slide-in" data-job="${job}">
                <h3>${info.label}</h3>
                <p>${description}</p>
            </div>`
    $(".job-page-blocks").append(html)
  })
}

const ResetPages = () => {
  $(".cityhall-identity-page, .cityhall-job-page").addClass("fade-out")
  setTimeout(() => {
    $(".cityhall-identity-page, .cityhall-job-page").hide().removeClass("fade-out")
    $(".cityhall-option-blocks").removeClass("fade-out slide-out").addClass("fade-in")
    $(".cityhall-option-blocks").show()
    $(".request-identity-button, .apply-job-button, .back-to-main").hide()
  }, 280)
}

$(document).ready(() => {
  window.addEventListener("message", (event) => {
    switch (event.data.action) {
      case "open":
        playSound("open")
        setUiOpen(true)
        $(".container").fadeIn(280).addClass("fade-in")
        break
      case "close":
        playSound("close")
        setUiOpen(false)
        $(".container").fadeOut(280, () => {
          ResetPages()
        })
        $(selectedJob).removeClass("job-selected")
        $(selectedIdentity).removeClass("identity-selected")
        break
      case "setJobs":
        SetJobs(event.data.jobs)
        break
    }
  })
})

$(document).on("keydown", (event) => {
  if (event.keyCode === 27) {
    playSound("close")
    $.post("https://dach-cityhall/close")
    setUiOpen(false)
    $(".container").fadeOut(280, () => ResetPages())
    $(selectedJob).removeClass("job-selected")
    $(selectedIdentity).removeClass("identity-selected")
  }
})

$(".cityhall-option-block").click(function (e) {
  e.preventDefault()
  playSound("nav")
  const blockPage = $(this).data("page")
  $(".cityhall-option-blocks").addClass("fade-out slide-out")
  setTimeout(() => {
    $(".cityhall-option-blocks").hide()
    $(`.cityhall-${blockPage}-page`).removeClass("fade-out").addClass("fade-in").css("display", "flex")
  }, 280)
  if (blockPage === "identity") {
    $(".identity-page-blocks").html("")
    $.post("https://dach-cityhall/requestLicenses", JSON.stringify({}), (licenses) => {
      $.each(licenses, (i, license) => {
        const elem = `
                        <div class="identity-page-block slide-in" data-type="${i}" data-cost="${license.cost}">
                            <h3>${license.label}</h3>
                            <p>Fee: $${license.cost}</p>
                        </div>`
        $(".identity-page-blocks").append(elem)
      })
    })
  }
  $(".back-to-main").show()
})

$(document).on("click", ".identity-page-block", function (e) {
  e.preventDefault()
  playSound("select")
  selectedIdentityType = $(this).data("type")
  selectedIdentityCost = $(this).data("cost")
  if (selectedIdentity === null) {
    $(this).addClass("identity-selected")
    selectedIdentity = this
    $(".request-identity-button").html(`Pay $${selectedIdentityCost}`).fadeIn(220)
  } else if (selectedIdentity === this) {
    $(this).removeClass("identity-selected")
    selectedIdentity = null
    $(".request-identity-button").fadeOut(220)
  } else {
    $(selectedIdentity).removeClass("identity-selected")
    $(this).addClass("identity-selected")
    selectedIdentity = this
    $(".request-identity-button").html(`Pay $${selectedIdentityCost}`).fadeIn(220)
  }
})

$(".request-identity-button").click((e) => {
  e.preventDefault()
  playSound("success")
  $.post(
    "https://dach-cityhall/requestId",
    JSON.stringify({
      type: selectedIdentityType,
      cost: selectedIdentityCost,
    }),
  )
  ResetPages()
})

$(document).on("click", ".job-page-block", function (e) {
  e.preventDefault()
  playSound("select")
  selectedJobId = $(this).data("job")
  if (selectedJob === null) {
    $(this).addClass("job-selected")
    selectedJob = this
    $(".apply-job-button").fadeIn(220)
  } else if (selectedJob === this) {
    $(this).removeClass("job-selected")
    selectedJob = null
    $(".apply-job-button").fadeOut(220)
  } else {
    $(selectedJob).removeClass("job-selected")
    $(this).addClass("job-selected")
    selectedJob = this
  }
})

$(".apply-job-button").click((e) => {
  e.preventDefault()
  playSound("success")
  $.post("https://dach-cityhall/applyJob", JSON.stringify(selectedJobId))
  ResetPages()
})

$(".back-to-main").click((e) => {
  e.preventDefault()
  playSound("click")
  $(selectedJob).removeClass("job-selected")
  $(selectedIdentity).removeClass("identity-selected")
  ResetPages()
})
