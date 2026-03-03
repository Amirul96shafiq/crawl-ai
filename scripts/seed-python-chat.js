/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-time script to add sample long conversation to "Python Data Science" archived chat.
 * Run: node scripts/seed-python-chat.js
 */
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "../dev.db");
const db = new Database(dbPath);

const SAMPLE_MESSAGES = [
  {
    role: "user",
    content:
      "What are the key concepts I should understand when getting started with Python for data science?",
  },
  {
    role: "assistant",
    content: `Great question! Here are the foundational concepts for Python data science:

**1. Core Libraries**
- **NumPy**: The foundation for numerical computing. Master arrays, broadcasting, and vectorized operations.
- **Pandas**: Essential for data manipulation. Learn DataFrames, Series, grouping, merging, and handling missing data.
- **Matplotlib & Seaborn**: For visualization. Start with basic plots, then explore statistical visualizations.

**2. Data Workflow**
- Loading data (CSV, Excel, databases)
- Cleaning and preprocessing (handling nulls, outliers, type conversion)
- Exploratory Data Analysis (EDA) with descriptive statistics
- Feature engineering for modeling

**3. Machine Learning Basics**
- Scikit-learn for supervised and unsupervised learning
- Train/test splits, cross-validation
- Model evaluation metrics (accuracy, precision, recall, RMSE)

**4. Best Practices**
- Use virtual environments (venv, conda)
- Jupyter notebooks for exploration, scripts for production
- Version control your code and data pipelines

Would you like me to dive deeper into any of these areas?`,
  },
  {
    role: "user",
    content:
      "Can you explain the difference between NumPy arrays and Python lists? When should I use each?",
  },
  {
    role: "assistant",
    content: `Excellent question! This is a common point of confusion.

**NumPy Arrays**
- **Homogeneous**: All elements must be the same type (e.g., all floats)
- **Fixed size**: Created with a fixed size; resizing creates a new array
- **Vectorized operations**: Math operations apply element-wise without loops
- **Memory efficient**: Stored in contiguous memory blocks
- **Use when**: Doing mathematical operations, working with large datasets, need performance

**Python Lists**
- **Heterogeneous**: Can mix types (strings, numbers, objects)
- **Dynamic**: Easy to append, insert, remove
- **Flexible**: Can nest lists, store any Python object
- **Use when**: General-purpose collection, small data, need flexibility

**Performance Example**
\`\`\`python
import numpy as np

# List: ~100ms for 1M elements
lst = [i * 2 for i in range(1_000_000)]

# NumPy: ~2ms for 1M elements
arr = np.arange(1_000_000) * 2
\`\`\`

**Rule of thumb**: Use NumPy when you're doing numerical computation; use lists for general data structures.`,
  },
  {
    role: "user",
    content:
      "What's the best way to handle missing data in Pandas? I've heard about fillna, dropna, and interpolation.",
  },
  {
    role: "assistant",
    content: `Handling missing data is crucial. Here's a practical guide:

**1. Assess the missingness**
\`\`\`python
df.isnull().sum()
df.isnull().mean() * 100  # percentage per column
\`\`\`

**2. dropna()** – Remove missing values
- \`df.dropna()\` – Drop any row with a NaN
- \`df.dropna(subset=['col1', 'col2'])\` – Drop only if specific cols are NaN
- \`df.dropna(thresh=5)\` – Keep rows with at least 5 non-null values
- **Use when**: Missing data is minimal (<5%) and likely random

**3. fillna()** – Replace with a value
- \`df.fillna(0)\` – Replace with constant
- \`df.fillna(df.mean())\` – Replace with column mean (numeric)
- \`df.fillna(method='ffill')\` – Forward fill (time series)
- **Use when**: You have a sensible default or the missingness has meaning

**4. Interpolation**
- \`df.interpolate()\` – Linear interpolation between known values
- \`df.interpolate(method='polynomial', order=2)\` – For smooth curves
- **Use when**: Time series or ordered data where values change smoothly

**5. Advanced: Model-based imputation**
- Use \`sklearn.impute.SimpleImputer\` or \`KNNImputer\` for ML pipelines
- Preserves relationships between variables

**Best practice**: Always document your choice and consider the impact on downstream analysis.`,
  },
  {
    role: "user",
    content:
      "How do I choose between a classification and regression model? And what about clustering?",
  },
  {
    role: "assistant",
    content: `The choice depends entirely on your **goal** and **target variable**:

**Classification** – Predicting a **category**
- Target: Discrete (e.g., spam/not spam, disease type, customer segment)
- Output: Class label or probability
- Examples: Logistic Regression, Random Forest, XGBoost, SVM
- Metrics: Accuracy, Precision, Recall, F1, ROC-AUC

**Regression** – Predicting a **continuous value**
- Target: Numeric (e.g., price, temperature, sales amount)
- Output: A number
- Examples: Linear Regression, Ridge, Lasso, Random Forest Regressor
- Metrics: MAE, RMSE, R², MAPE

**Clustering** – Finding **groups** (unsupervised)
- No target variable; discover natural structure in data
- Use when: You don't know the groups in advance (customer segmentation, anomaly detection)
- Examples: K-Means, Hierarchical, DBSCAN
- Metrics: Silhouette score, inertia (K-Means)

**Decision flowchart**
1. Do I have labeled data? → Yes: supervised (classification or regression)
2. Is my target categorical or numeric? → Categorical: classification; Numeric: regression
3. No labels? → Clustering or dimensionality reduction (PCA, t-SNE)

**Hybrid**: Sometimes you use clustering to create features for a classification model!`,
  },
  {
    role: "user",
    content:
      "What are some common pitfalls beginners make when doing data science in Python?",
  },
  {
    role: "assistant",
    content: `Here are the most common pitfalls and how to avoid them:

**1. Not exploring the data first**
- Jumping straight to modeling without EDA
- **Fix**: Always visualize distributions, check for outliers, understand correlations

**2. Data leakage**
- Using future or test information during training (e.g., scaling before train/test split)
- **Fix**: Split first, then fit transformers on training data only

**3. Ignoring class imbalance**
- Using accuracy on imbalanced data (99% accuracy can mean predicting only the majority class)
- **Fix**: Use precision/recall/F1, SMOTE, or class weights

**4. Overfitting**
- Model memorizes training data, fails on new data
- **Fix**: Cross-validation, regularization, more data, simpler models

**5. Wrong evaluation metric**
- Using accuracy for imbalanced classification
- **Fix**: Match metric to business goal (e.g., recall for fraud detection)

**6. Not versioning or documenting**
- Can't reproduce results
- **Fix**: Use Git, requirements.txt, document preprocessing steps

**7. Assuming causality from correlation**
- Correlation ≠ causation
- **Fix**: Be careful with interpretation; consider causal inference methods

**8. Scaling issues**
- Forgetting to scale features for distance-based algorithms (K-Means, SVM)
- **Fix**: Use StandardScaler or MinMaxScaler when needed

Start with a solid EDA, then iterate on modeling!`,
  },
];

const chat = db
  .prepare(
    "SELECT id, title FROM Chat WHERE title = ? AND archivedAt IS NOT NULL"
  )
  .get("Python Data Science");

if (!chat) {
  console.error('No archived chat named "Python Data Science" found.');
  process.exit(1);
}

const count = db
  .prepare("SELECT COUNT(*) as c FROM Message WHERE chatId = ?")
  .get(chat.id);

if (count.c > 0) {
  console.log(
    `Chat "${chat.title}" already has ${count.c} messages. Skipping.`
  );
  process.exit(0);
}

const insert = db.prepare(
  "INSERT INTO Message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)"
);

const { randomBytes } = require("crypto");
const now = new Date().toISOString();

for (const m of SAMPLE_MESSAGES) {
  const id = "c" + randomBytes(12).toString("hex");
  insert.run(id, chat.id, m.role, m.content, now);
}

console.log(
  `Added ${SAMPLE_MESSAGES.length} messages to "${chat.title}" (${chat.id})`
);
db.close();
