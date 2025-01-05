# import torch
# from PIL import Image
# from transformers import (
#     BitsAndBytesConfig,
#     PaliGemmaForConditionalGeneration,
#     PaliGemmaProcessor,
#     Trainer,
#     TrainingArguments,
# )

# model = PaliGemmaForConditionalGeneration.from_pretrained("NYUAD-ComNets/FaceScanPaliGemma_Emotion", torch_dtype=torch.bfloat16, force_download=True)

# IMAGE_TOKEN = "<image>"
# BOS_TOKEN = "<bos>"
# input_text = IMAGE_TOKEN + "what is the emotion of the person in the image?" + BOS_TOKEN

# processor = PaliGemmaProcessor.from_pretrained("google/paligemma-3b-pt-224", force_download=True)

# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# model.to(device)


# input_image = Image.open("image.jpg")
# inputs = processor(text=input_text, images=input_image, padding="longest", do_convert_rgb=True, return_tensors="pt").to(device)
# inputs = inputs.to(dtype=model.dtype)

# with torch.no_grad():
#     output = model.generate(**inputs, max_length=500)
# result = processor.decode(output[0], skip_special_tokens=True)[len(input_text) :].strip()
