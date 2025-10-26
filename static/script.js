let selectedQuestions = [];
let userAnswers = {};

// 開始測驗
async function startQuiz() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/questions');
        const data = await response.json();
        
        if (data.success) {
            selectedQuestions = data.questions;
            renderQuestions();
            
            // 切換畫面
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('quizScreen').classList.remove('hidden');
        } else {
            alert('載入題目失敗');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('載入題目時發生錯誤');
    } finally {
        showLoading(false);
    }
}

// 渲染題目
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    selectedQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-card';
        
        let aspectsHTML = '';
        q.面向.forEach(aspect => {
            aspectsHTML += `
                <div class="answer-item">
                    <label class="answer-label">${aspect.名稱}</label>
                    <div class="prompt-label">💡 作答提示：</div>
                    <div class="prompt-text">${aspect.提示}</div>
                    <textarea 
                        id="answer_${q.id}_${aspect.名稱}" 
                        placeholder="請根據上方提示輸入您的答案..."
                        data-qid="${q.id}"
                        data-field="${aspect.名稱}"
                    ></textarea>
                </div>
            `;
        });
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">第 ${index + 1} 題</span>
                <span class="question-category">${q.分類} - ${q.題號}</span>
            </div>
            <div class="question-topic">${q.主題}</div>
            <div class="question-description">${q.敘述}</div>
            <div class="answer-section">
                ${aspectsHTML}
            </div>
        `;
        
        container.appendChild(questionDiv);
    });
}

// 提交答案
async function submitAnswers() {
    // 收集答案
    userAnswers = {};
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        const qid = parseInt(textarea.dataset.qid);
        const field = textarea.dataset.field;
        
        if (!userAnswers[qid]) {
            userAnswers[qid] = {};
        }
        
        userAnswers[qid][field] = textarea.value;
    });
    
    // 準備提交數據
    const submitData = {
        answers: userAnswers,
        question_ids: selectedQuestions.map(q => q.id)
    };
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResults(data);
        } else {
            alert('提交失敗');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('提交答案時發生錯誤');
    } finally {
        showLoading(false);
    }
}

// 顯示結果
function showResults(data) {
    const finalScore = data.final_score;
    let message = '';
    
    if (finalScore >= 90) message = '🎉 優秀！';
    else if (finalScore >= 80) message = '👍 很好！';
    else if (finalScore >= 70) message = '✅ 良好！';
    else if (finalScore >= 60) message = '💪 及格！';
    else message = '📚 需要加強';
    
    // 設定分數顯示
    document.getElementById('scoreDisplay').textContent = finalScore + ' 分';
    document.getElementById('scoreMessage').textContent = message;
    
    // 生成詳細結果
    let resultHTML = '';
    
    data.results.forEach((result, qIndex) => {
        resultHTML += `<h3 class="question-result-title">第 ${qIndex + 1} 題：${result.主題} (${result.分類})</h3>`;
        
        result.fields.forEach(field => {
            resultHTML += `
                <div class="answer-comparison">
                    <div class="comparison-header">${field.name} (得分: ${field.score}分)</div>
                    <div class="your-answer">
                        <div class="answer-label-small">您的答案：</div>
                        ${field.user_answer || '<em style="color: #999;">未作答</em>'}
                    </div>
                    <div class="correct-answer">
                        <div class="answer-label-small">參考答案：</div>
                        ${field.correct_answer || '<em style="color: #999;">無標準答案</em>'}
                    </div>
                </div>
            `;
        });
    });
    
    document.getElementById('resultDetails').innerHTML = resultHTML;
    
    // 切換畫面
    document.getElementById('quizScreen').classList.add('hidden');
    document.getElementById('resultScreen').classList.remove('hidden');
}

// 顯示/隱藏載入中
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}
