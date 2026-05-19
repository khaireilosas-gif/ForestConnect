import google.generativeai as genai

# 🚨 Put your exact API key inside the quotes! 🚨
genai.configure(api_key="AIzaSyB2fzgatyQHLB_rt0VxJhnL5YovyEn3FrI")

print("Checking Google's servers for your available models...")

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ You can use: {m.name}")
except Exception as e:
    print(f"❌ Error connecting: {e}")