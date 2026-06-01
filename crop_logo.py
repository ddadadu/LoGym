from PIL import Image

# 이미지 열기
img_path = "/Users/kmj/.gemini/antigravity-ide/brain/aa529dd2-028b-4683-801d-2b0875fce714/media__1780234487843.png"
img = Image.open(img_path)

# 이미지 크기 확인
width, height = img.size
print(f"Original size: {width}x{height}")

# 로고명(LoGym 글자)은 하단에 있으므로,
# 위쪽의 마커+바벨 이미지만 남기도록 자르기
# 대략적으로 하단 30%를 잘라냄 (확인 필요)
crop_height = int(height * 0.65)
cropped_img = img.crop((0, 0, width, crop_height))

# 비율을 1:1로 맞추기 위해 좌우 여백을 자르거나 조정
# 현재 너비가 높이보다 크다면 가운데 정렬로 자르기
if width > crop_height:
    margin = (width - crop_height) // 2
    cropped_img = cropped_img.crop((margin, 0, width - margin, crop_height))

print(f"Cropped size: {cropped_img.size}")

# 저장
save_path = "/Users/kmj/DV/antigravity/LoGym/public/favicon.png"
cropped_img.save(save_path)
print("Saved to", save_path)
