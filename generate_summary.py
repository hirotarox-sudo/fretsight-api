import os

output_file = "all_source_code.txt"
root_dir = "."

extensions = [".py", ".tsx", ".ts", ".css", ".html", ".json"]
ignore_dirs = ["venv", "node_modules", ".git", ".idea", "dist", "build", "__pycache__", ".gemini"]

with open(output_file, "w", encoding="utf-8") as outfile:
    for root, dirs, files in os.walk(root_dir):
        # Filter directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file)
            
            if ext in extensions:
                # Skip large lock files or irrelevant files
                if file == "package-lock.json" or file == "tsconfig.tsbuildinfo":
                    continue
                
                # Determine comment style
                header = ""
                if ext == ".py":
                    header = f"\n\n# === FILE: {file_path} ===\n\n"
                elif ext in [".ts", ".tsx", ".js", ".jsx", ".json"]:
                    header = f"\n\n// === FILE: {file_path} ===\n\n"
                elif ext == ".css":
                    header = f"\n\n/* === FILE: {file_path} === */\n\n"
                elif ext == ".html":
                    header = f"\n\n<!-- === FILE: {file_path} === -->\n\n"
                else:
                    header = f"\n\n# === FILE: {file_path} ===\n\n" # Fallback

                outfile.write(header)
                try:
                    with open(file_path, "r", encoding="utf-8") as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"\n# Error reading file: {e}")

print(f"Source code summary generated at {os.path.abspath(output_file)}")
