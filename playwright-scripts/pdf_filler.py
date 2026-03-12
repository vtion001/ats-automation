"""
PDF Auto-Filler
Auto-fills PDF forms with patient data from open portal
"""

import os
import json
from pathlib import Path
from typing import Dict, Optional
import pdfplumber
from pypdf import PdfReader, PdfWriter


class PDFAutoFiller:
    def __init__(self, client: str = "element"):
        self.client = client
        self.field_mappings = self._load_field_mappings()
        self.templates_dir = Path(__file__).parent.parent / "config" / "pdf_templates"

    def _load_field_mappings(self) -> dict:
        mapping_path = Path(__file__).parent.parent / "config" / "field-mappings" / f"{self.client}.json"
        if mapping_path.exists():
            with open(mapping_path) as f:
                return json.load(f)
        return {}

    def detect_form_fields(self, pdf_path: str) -> Dict[str, str]:
        fields = {}
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    annotations = page.page_obj.get("/Annots")
                    if annotations:
                        for annot in annotations:
                            field_name = annot.get("/T")
                            if field_name:
                                fields[str(field_name)] = ""
        except Exception as e:
            print(f"Error detecting fields: {e}")
        
        return fields

    def fill_pdf(self, pdf_path: str, data: Dict[str, str], output_path: Optional[str] = None) -> str:
        if output_path is None:
            base, ext = os.path.splitext(pdf_path)
            output_path = f"{base}_filled{ext}"

        try:
            reader = PdfReader(pdf_path)
            writer = PdfWriter()

            for page in reader.pages:
                writer.add_page(page)

            writer.update_form_field_values(data)

            with open(output_path, "wb") as f:
                writer.write(f)

            return output_path

        except Exception as e:
            print(f"Error filling PDF: {e}")
            return ""

    def get_common_fields(self) -> Dict[str, str]:
        return {
            "patient_name": "",
            "patient_dob": "",
            "patient_address": "",
            "insurance_id": "",
            "group_number": "",
            "provider_name": "",
            "date_of_service": "",
            "diagnosis_code": "",
            "cpt_code": ""
        }

    def extract_data_from_clipboard(self) -> Dict[str, str]:
        try:
            import pyperclip
            text = pyperclip.paste()
            
            data = {}
            
            import re
            name_match = re.search(r"(?:Name|Patient)[:\s]+(.+?)(?:\n|$)", text, re.IGNORECASE)
            if name_match:
                data["patient_name"] = name_match.group(1).strip()
            
            dob_match = re.search(r"(?:DOB|Date of Birth)[:\s]+(.+?)(?:\n|$)", text, re.IGNORECASE)
            if dob_match:
                data["patient_dob"] = dob_match.group(1).strip()
            
            phone_match = re.search(r"(?:Phone|Phone#)[:\s]+(.+?)(?:\n|$)", text, re.IGNORECASE)
            if phone_match:
                data["patient_phone"] = phone_match.group(1).strip()
            
            return data
        except:
            return {}


def watch_and_fill(watch_dir: str):
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    
    class PDFHandler(FileSystemEventHandler):
        def __init__(self, filler):
            self.filler = filler
            self.processed = set()
        
        def on_created(self, event):
            if event.is_directory:
                return
            
            if event.src_path.endswith(".pdf") and event.src_path not in self.processed:
                self.processed.add(event.src_path)
                print(f"New PDF detected: {event.src_path}")
                
                data = self.filler.extract_data_from_clipboard()
                if data:
                    self.filler.fill_pdf(event.src_path, data)
                    print(f"Filled PDF: {event.src_path}")

    filler = PDFAutoFiller()
    observer = Observer()
    observer.schedule(PDFHandler(filler), watch_dir, recursive=False)
    observer.start()
    
    print(f"Watching {watch_dir} for new PDFs...")
    
    try:
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    
    observer.join()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "watch":
        watch_dir = sys.argv[2] if len(sys.argv) > 2 else str(Path.home() / "Downloads")
        watch_and_fill(watch_dir)
    else:
        filler = PDFAutoFiller()
        print("Available fields:", filler.get_common_fields())
