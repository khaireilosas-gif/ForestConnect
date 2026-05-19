from google import genai

# Your API Key
client = genai.Client(api_key="AIzaSyCk5UNaroLMOXni_lRRVGPW10H9wL5Rxac")

print("\n🔍 Asking Google what models you have access to...")
print("==================================================")

try:
    models = client.models.list()
    for model in models:
        # We only want to see models that generate text
        if 'generateContent' in model.supported_actions:
            print(f"✅ Available Model Name: '{model.name}'")
except Exception as e:
    print(f"❌ Error getting list: {e}")

print("==================================================\n")