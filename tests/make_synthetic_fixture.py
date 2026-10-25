"""Generate a random PyTorch model and image to compare with local JS inference.
Only a developer test, not a CAPTCHA classifier. Requires torch + numpy.
"""
from pathlib import Path
import json
import numpy as np
import torch
from torch import nn

HERE = Path(__file__).parent
rng = np.random.default_rng(123456)
torch.manual_seed(2345)
net = nn.Sequential(
    nn.Conv2d(3, 16, kernel_size=3, stride=2, padding=1),
    nn.BatchNorm2d(16),
    nn.ReLU(),
    nn.Conv2d(16, 16, kernel_size=3, stride=2, padding=1),
    nn.BatchNorm2d(16),
    nn.ReLU(),
    nn.AdaptiveAvgPool2d(2),
    nn.Flatten(),
    nn.Linear(64, 10)
)
with torch.no_grad():
    for m in net:
        if isinstance(m, nn.Conv2d):
            nn.init.normal_(m.weight, 0, 0.3)
            nn.init.normal_(m.bias, 0, 0.5)
        elif isinstance(m, nn.BatchNorm2d):
            m.weight.copy_(torch.rand_like(m.weight) * 1.5 + 0.2)
            m.bias.copy_(torch.randn_like(m.bias) * 0.5)
            m.running_mean.copy_(torch.randn_like(m.running_mean))
            m.running_var.copy_(torch.rand_like(m.running_var) + 0.3)
        elif isinstance(m, nn.Linear):
            nn.init.normal_(m.weight, 0, 0.5)
            nn.init.normal_(m.bias, 0, 0.6)
net.eval()

# Test several heights; RGBA output normalizes RGB only.
fixtures = []
for height in [16, 25, 34, 45, 60]:
    image = rng.integers(0, 255, size=(height, 100, 4), dtype=np.uint8)
    answers = []
    logits = []
    with torch.no_grad():
        for i in range(6):
            chw = image[:, i*16:(i+1)*16, :3].astype(np.float32).transpose(2, 0, 1)/255.0
            predict = net(torch.from_numpy(chw).unsqueeze(0))[0]
            answers.append(str(int(torch.argmax(predict))))
            logits.append([float(x) for x in predict])
    fixtures.append({'height':height,'width':100,'rgba':image.flatten().tolist(), 'answer':''.join(answers)})
torch.save(net.state_dict(), HERE/'synthetic.pt')
(HERE/'synthetic.json').write_text(json.dumps(fixtures), encoding='utf-8')
print('Saved synthetic fixtures, expected:', [(x['height'], x['answer']) for x in fixtures])
