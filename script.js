import { supabase } from './supabase/client.js'

const categories = [
  "BEST STUDENT OF THE YEAR",
  "MOST OUTSTANDING STUDENT",
  "BEST DEPARTMENT OF THE YEAR",
  "OUTSTANDING S.U.G EXECUTIVE",
  "BEST COURSE REP OF THE YEAR",
  "BEST DEAN OF THE YEAR",
  "OUTSTANDING LEADER OF THE YEAR",
  "BEST MALE LECTURER OF THE YEAR",
  "BEST STUDENT ENTREPRENEUR OF THE YEAR",
  "BEST FEMALE LECTURER OF THE YEAR",
  "BEST TIKTOKER OF THE YEAR",
  "PHOTOGRAPHER OF THE YEAR",
  "FASHION ICON OF THE YEAR",
  "SPORT PERSONALITY OF THE YEAR",
  "BEST MALE DRESSED OF THE YEAR",
  "BEST FEMALE COMRADE OF THE YEAR",
  "BEST FEMALE DRESSED OF THE YEAR",
  "MOST SUPPORTIVE LEADER OF THE YEAR",
  "MOST VALUABLE PLAYER (M.V.P)",
  "OUTSTANDING COMRADE OF THE YEAR",
  "BEST COOPERATE STUDENT OF THE YEAR",
  "MOST BEAUTIFUL GIRL",
  "MOST SOCIAL STUDENT",
  "MOST CUTE GUY OF THE YEAR",
  "BEST HOD OF THE YEAR",
  "BEST CHRISTIAN PERSONALITY",
  "EXCELLENCE",
  "OUTSTANDING DIRECTOR OF THE YEAR",
  "BEST RED CARPET HOST OF THE YEAR"
]

const categoryIds = {}
categories.forEach((cat, index) => {
  categoryIds[cat] = index + 1
})

// Generate form
const container = document.getElementById('categoriesContainer')
categories.forEach(category => {
  const div = document.createElement('div')
  div.className = 'category-group'
  div.innerHTML = `
    <label>${category}</label>
    <input type="text" class="nominee-input" data-category="${category}" placeholder="Enter nominee name..." required />
  `
  container.appendChild(div)
})

// Handle submit
document.getElementById('votingForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const voterName = document.getElementById('voterName').value.trim()
  const voterEmail = document.getElementById('voterEmail').value.trim()

  const inputs = document.querySelectorAll('.nominee-input')
  const votes = []

  inputs.forEach(input => {
    const nomineeName = input.value.trim()
    const categoryName = input.dataset.category
    if (nomineeName) {
      votes.push({
        voter_name: voterName,
        email: voterEmail,
        category_id: categoryIds[categoryName],
        category_name: categoryName,
        nominee_name: nomineeName
      })
    }
  })

  if (votes.length === 0) {
    showMessage('Please nominate at least one person.', 'error')
    return
  }

  let successCount = 0
  let errorCount = 0

  for (const vote of votes) {
    try {
      // Check if already voted
      const { data: existing } = await supabase
        .from('votes')
        .select('id')
        .eq('email', vote.email)
        .eq('category_id', vote.category_id)
        .single()

      if (existing) {
        errorCount++
        continue
      }

      // Insert vote
      const { error } = await supabase
        .from('votes')
        .insert([vote])

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    } catch (err) {
      errorCount++
    }
  }

  if (errorCount === 0) {
    showMessage(`✅ All ${successCount} votes submitted successfully!`, 'success')
    document.getElementById('votingForm').reset()
  } else {
    showMessage(`⚠️ ${successCount} submitted, ${errorCount} failed (you may have already voted in some categories)`, 'error')
  }
})

function showMessage(msg, type) {
  const div = document.getElementById('message')
  div.textContent = msg
  div.className = type
}