import torch
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv

class FraudGATv2(torch.nn.Module):
    def __init__(self, in_channels=5, hidden_channels=16, heads=4, out_channels=1):
        super(FraudGATv2, self).__init__()
        # First layer: concatenate heads. Output dimension becomes hidden_channels * heads
        self.conv1 = GATv2Conv(in_channels, hidden_channels, heads=heads, concat=True)
        
        # Second layer: average heads for final output. Output dimension becomes out_channels
        self.conv2 = GATv2Conv(hidden_channels * heads, out_channels, heads=heads, concat=False)

    def forward(self, x, edge_index):
        # First layer
        x = self.conv1(x, edge_index)
        x = F.elu(x)
        
        # Dropout to prevent overfitting
        x = F.dropout(x, p=0.5, training=self.training)
        
        # Second layer
        x = self.conv2(x, edge_index)
        
        # Note: We omit the Sigmoid activation here because we will use BCEWithLogitsLoss 
        # during training, which combines Sigmoid + BCELoss for numerical stability.
        # We will manually apply Sigmoid during inference to get probabilities (0.0 to 1.0).
        return x
