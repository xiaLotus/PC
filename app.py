from flask import Flask, render_template, jsonify, request
import json
import random

app = Flask(__name__)

# 載入題庫
def load_questions():
    with open('questions.json', 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def index():
    """首頁"""
    return render_template('index.html')

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """隨機抽題：IT 1題 + 軟體 1題"""
    questions = load_questions()
    
    # 分類題目
    it_questions = [q for q in questions if q['分類'] == 'IT']
    software_questions = [q for q in questions if q['分類'] == '軟體']
    
    # 隨機選擇
    selected = []
    if it_questions:
        selected.append(random.choice(it_questions))
    if software_questions:
        selected.append(random.choice(software_questions))
    
    return jsonify({
        'success': True,
        'questions': selected
    })

@app.route('/api/submit', methods=['POST'])
def submit_answers():
    """評分"""
    data = request.json
    user_answers = data.get('answers', {})
    question_ids = data.get('question_ids', [])
    
    questions = load_questions()
    results = []
    total_score = 0
    max_score = 0
    
    for qid in question_ids:
        # 找到對應題目
        question = next((q for q in questions if q['id'] == qid), None)
        if not question:
            continue
        
        question_result = {
            'id': qid,
            '主題': question['主題'],
            '分類': question['分類'],
            'fields': []
        }
        
        # 評分每個面向
        for aspect in question['面向']:
            field_name = aspect['名稱']
            correct_answer = aspect['解答']
            user_answer = user_answers.get(str(qid), {}).get(field_name, '')
            
            # 計算分數
            score = calculate_score(user_answer, correct_answer)
            total_score += score
            max_score += 100
            
            question_result['fields'].append({
                'name': field_name,
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'score': round(score, 2)
            })
        
        results.append(question_result)
    
    final_score = round((total_score / max_score * 100) if max_score > 0 else 0, 2)
    
    return jsonify({
        'success': True,
        'final_score': final_score,
        'results': results
    })

def calculate_score(user_text, correct_text):
    """計算答案相似度分數 - 寬鬆版本"""
    if not user_text or not user_text.strip():
        return 0
    
    if not correct_text or not correct_text.strip():
        # 如果沒有標準答案，只要有作答就給60分
        return 60 if len(user_text.strip()) > 5 else 40
    
    user_text = user_text.lower().strip()
    correct_text = correct_text.lower().strip()
    
    # 完全一致
    if user_text == correct_text:
        return 100
    
    # 移除標點符號和空白進行比較
    user_clean = user_text.replace(',', '').replace('，', '').replace('、', '').replace(' ', '').replace('\n', '')
    correct_clean = correct_text.replace(',', '').replace('，', '').replace('、', '').replace(' ', '').replace('\n', '')
    
    if user_clean == correct_clean:
        return 100
    
    # 提取關鍵詞（長度>1的詞）
    import re
    correct_words = [w for w in re.split(r'[\s,，、。\n]+', correct_text) if len(w) > 1]
    user_words = [w for w in re.split(r'[\s,，、。\n]+', user_text) if len(w) > 1]
    
    if not correct_words:
        return 60 if len(user_text) > 5 else 40
    
    # 計算匹配的關鍵詞數量（包含部分匹配）
    match_count = 0
    for correct_word in correct_words:
        for user_word in user_words:
            # 雙向包含檢查
            if (correct_word in user_word or user_word in correct_word or 
                len(set(correct_word) & set(user_word)) / len(correct_word) > 0.6):
                match_count += 1
                break
    
    match_rate = match_count / len(correct_words)
    
    # 寬鬆評分標準
    if match_rate >= 0.8:  # 80%關鍵詞匹配
        return 100
    elif match_rate >= 0.6:  # 60%關鍵詞匹配
        return 95
    elif match_rate >= 0.5:  # 50%關鍵詞匹配
        return 85
    elif match_rate >= 0.4:  # 40%關鍵詞匹配
        return 75
    elif match_rate >= 0.3:  # 30%關鍵詞匹配
        return 65
    elif match_rate >= 0.2:  # 20%關鍵詞匹配
        return 50
    else:
        return max(30, int(match_rate * 100))
    
if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
