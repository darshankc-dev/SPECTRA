import { SampleLabel } from '../types';

export const MODEL_VERSION = 'BIT-PLATE-CV-1.0';
export const DECISION_THRESHOLD = 0.5;

export const EXPECTED_MODEL_HASHES = {
  'inference.py': '322647cb2e9b5466fe675af56564114532a3c50366ea4fad2961d69a88089ffc',
  'classifier.npz': 'd05a524ac10d6cb864e82da5adb69c0762308ddc05f833fd96eac336c4984ed2',
  'model_metadata.json': '945f45a455106bede24345e802a64eafd9a6d6a928829f2b1de7f151c49dd017',
} as const;

export const CLASSIFIER_WEIGHTS = {
  mean: [
    0.7221202618634256, 0.01353527832832306, -0.027991013071895415,
    -0.016382352941176414, -0.013063725490196035, -0.007077614379084946,
    0.00716503267973854, 0.013019607843137212, 0.016144607843137204,
    0.021126633986928038, 0.00537480107060185, 0.002720359519675924,
    0.002126645688657409, 0.0014743381076388878, 0.0009941044560185187,
    0.004901177473913547, 0.0031478346089897943,
  ],
  scale: [
    0.045139926625397564, 0.006065319780497459, 0.026953707020687744,
    0.004411499628928328, 0.0036394926875788405, 0.0023408867358752977,
    0.002366165971118537, 0.003599735134858981, 0.0043595983088417336,
    0.0055501727455115855, 0.006250121346356643, 0.00360603880937023,
    0.003126127250350472, 0.0025697230521167, 0.0020182550211650203,
    0.0015171878789313538, 0.0009441318424503454,
  ],
  coef: [
    -0.6553935876111687, 2.958645265403201, -0.7507741952815251,
    0.43111940411897537, 0.2447420747419611, 0.33015178410591306,
    -0.5214179988822669, -0.15004432272826151, -0.03569827211551854,
    -0.04854371976929702, 0.3941243174764409, 6.922984118757022,
    2.4456150426147323, 0.8853179971508228, 0.5820309353217268,
    0.17028838680451, -0.19198522586294567,
  ],
  intercept: 6.842521289063182,
};

export interface ModelLimitation {
  title: string;
  description: string;
}

export const MODEL_LIMITATIONS: ModelLimitation[] = [
  {
    title: 'Fixed Centering Requirement',
    description: 'The model strictly requires specimen plates to be centrally positioned within the optical frame. Off-center crops cause spatial quantile skew and false readings.'
  },
  {
    title: 'Rigid 96×96 Crop Geometry',
    description: 'Inference features are computed exclusively on the central 96×96 region of a 128×128 resized image, blind to defects near extreme outer perimeter edges.'
  },
  {
    title: 'Luminescence Sensitivity',
    description: 'Conversion to grayscale luminance (Pillow L = 0.299R + 0.587G + 0.114B) makes the residual median sensitive to non-uniform ambient illumination or glare.'
  },
  {
    title: 'Binary Only (No Subtyping)',
    description: 'Model outputs only binary classification (Normal vs. Defective). It cannot distinguish micro-pits from scratches, cracks, or discoloration.'
  },
  {
    title: 'Absence of Defect Localization',
    description: 'Does not output pixel segmentation masks or bounding boxes; human review is required to localize the specific defect coordinate.'
  },
  {
    title: 'Uncalibrated Logistic Probabilities',
    description: 'Defect probabilities are direct sigmoid outputs of a linear model, not temperature-scaled or Bayesian calibrated safety probabilities.'
  },
  {
    title: 'Synthetic Training Distribution',
    description: 'Trained on synthetic metal plate textures. Domain adaptation is required before deployment on physical alloy grain variations or oil coatings.'
  }
];

export const EVALUATION_METRICS = {
  accuracy: 1.0,
  precision: 1.0,
  recall: 1.0,
  f1Score: 1.0,
  confusionMatrix: {
    tp: 30,
    fp: 0,
    fn: 0,
    tn: 30
  }
};

export const SYNTHETIC_SAMPLE_LABELS: SampleLabel[] = [
  { imageId: 'R2-001', relativePath: 'images/inspection_001.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-002', relativePath: 'images/inspection_002.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9283, defectProbability: 0.0717, outcome: 'TN' },
  { imageId: 'R2-003', relativePath: 'images/inspection_003.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-004', relativePath: 'images/inspection_004.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9999, defectProbability: 0.9999, outcome: 'TP' },
  { imageId: 'R2-005', relativePath: 'images/inspection_005.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9961, defectProbability: 0.0039, outcome: 'TN' },
  { imageId: 'R2-006', relativePath: 'images/inspection_006.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9854, defectProbability: 0.0146, outcome: 'TN' },
  { imageId: 'R2-007', relativePath: 'images/inspection_007.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9945, defectProbability: 0.0055, outcome: 'TN' },
  { imageId: 'R2-008', relativePath: 'images/inspection_008.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9782, defectProbability: 0.0218, outcome: 'TN' },
  { imageId: 'R2-009', relativePath: 'images/inspection_009.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-010', relativePath: 'images/inspection_010.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9812, defectProbability: 0.0188, outcome: 'TN' },
  { imageId: 'R2-011', relativePath: 'images/inspection_011.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-012', relativePath: 'images/inspection_012.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9998, defectProbability: 0.9998, outcome: 'TP' },
  { imageId: 'R2-013', relativePath: 'images/inspection_013.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9972, defectProbability: 0.0028, outcome: 'TN' },
  { imageId: 'R2-014', relativePath: 'images/inspection_014.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9995, defectProbability: 0.9995, outcome: 'TP' },
  { imageId: 'R2-015', relativePath: 'images/inspection_015.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-016', relativePath: 'images/inspection_016.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9845, defectProbability: 0.0155, outcome: 'TN' },
  { imageId: 'R2-017', relativePath: 'images/inspection_017.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9921, defectProbability: 0.0079, outcome: 'TN' },
  { imageId: 'R2-018', relativePath: 'images/inspection_018.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9768, defectProbability: 0.0232, outcome: 'TN' },
  { imageId: 'R2-019', relativePath: 'images/inspection_019.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-020', relativePath: 'images/inspection_020.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9881, defectProbability: 0.0119, outcome: 'TN' },
  { imageId: 'R2-021', relativePath: 'images/inspection_021.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9953, defectProbability: 0.0047, outcome: 'TN' },
  { imageId: 'R2-022', relativePath: 'images/inspection_022.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9997, defectProbability: 0.9997, outcome: 'TP' },
  { imageId: 'R2-023', relativePath: 'images/inspection_023.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-024', relativePath: 'images/inspection_024.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9996, defectProbability: 0.9996, outcome: 'TP' },
  { imageId: 'R2-025', relativePath: 'images/inspection_025.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-026', relativePath: 'images/inspection_026.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9839, defectProbability: 0.0161, outcome: 'TN' },
  { imageId: 'R2-027', relativePath: 'images/inspection_027.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-028', relativePath: 'images/inspection_028.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9892, defectProbability: 0.0108, outcome: 'TN' },
  { imageId: 'R2-029', relativePath: 'images/inspection_029.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-030', relativePath: 'images/inspection_030.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9841, defectProbability: 0.0159, outcome: 'TN' },
  { imageId: 'R2-031', relativePath: 'images/inspection_031.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-032', relativePath: 'images/inspection_032.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9998, defectProbability: 0.9998, outcome: 'TP' },
  { imageId: 'R2-033', relativePath: 'images/inspection_033.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-034', relativePath: 'images/inspection_034.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9994, defectProbability: 0.9994, outcome: 'TP' },
  { imageId: 'R2-035', relativePath: 'images/inspection_035.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-036', relativePath: 'images/inspection_036.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9999, defectProbability: 0.9999, outcome: 'TP' },
  { imageId: 'R2-037', relativePath: 'images/inspection_037.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9918, defectProbability: 0.0082, outcome: 'TN' },
  { imageId: 'R2-038', relativePath: 'images/inspection_038.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9992, defectProbability: 0.9992, outcome: 'TP' },
  { imageId: 'R2-039', relativePath: 'images/inspection_039.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-040', relativePath: 'images/inspection_040.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9856, defectProbability: 0.0144, outcome: 'TN' },
  { imageId: 'R2-041', relativePath: 'images/inspection_041.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9934, defectProbability: 0.0066, outcome: 'TN' },
  { imageId: 'R2-042', relativePath: 'images/inspection_042.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9798, defectProbability: 0.0202, outcome: 'TN' },
  { imageId: 'R2-043', relativePath: 'images/inspection_043.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9942, defectProbability: 0.0058, outcome: 'TN' },
  { imageId: 'R2-044', relativePath: 'images/inspection_044.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9873, defectProbability: 0.0127, outcome: 'TN' },
  { imageId: 'R2-045', relativePath: 'images/inspection_045.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-046', relativePath: 'images/inspection_046.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9829, defectProbability: 0.0171, outcome: 'TN' },
  { imageId: 'R2-047', relativePath: 'images/inspection_047.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9948, defectProbability: 0.0052, outcome: 'TN' },
  { imageId: 'R2-048', relativePath: 'images/inspection_048.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9996, defectProbability: 0.9996, outcome: 'TP' },
  { imageId: 'R2-049', relativePath: 'images/inspection_049.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-050', relativePath: 'images/inspection_050.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9867, defectProbability: 0.0133, outcome: 'TN' },
  { imageId: 'R2-051', relativePath: 'images/inspection_051.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9959, defectProbability: 0.0041, outcome: 'TN' },
  { imageId: 'R2-052', relativePath: 'images/inspection_052.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9804, defectProbability: 0.0196, outcome: 'TN' },
  { imageId: 'R2-053', relativePath: 'images/inspection_053.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-054', relativePath: 'images/inspection_054.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9997, defectProbability: 0.9997, outcome: 'TP' },
  { imageId: 'R2-055', relativePath: 'images/inspection_055.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9912, defectProbability: 0.0088, outcome: 'TN' },
  { imageId: 'R2-056', relativePath: 'images/inspection_056.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9851, defectProbability: 0.0149, outcome: 'TN' },
  { imageId: 'R2-057', relativePath: 'images/inspection_057.png', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 1.0, defectProbability: 1.0, outcome: 'TP' },
  { imageId: 'R2-058', relativePath: 'images/inspection_058.jpg', productId: 'P-PLATE01', actualLabel: 'Defective', predictedClass: 'Defective', confidence: 0.9995, defectProbability: 0.9995, outcome: 'TP' },
  { imageId: 'R2-059', relativePath: 'images/inspection_059.png', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9938, defectProbability: 0.0062, outcome: 'TN' },
  { imageId: 'R2-060', relativePath: 'images/inspection_060.jpg', productId: 'P-PLATE01', actualLabel: 'Normal', predictedClass: 'Normal', confidence: 0.9842, defectProbability: 0.0158, outcome: 'TN' },
];

export const SAMPLE_LABELS = SYNTHETIC_SAMPLE_LABELS.map((item) => ({
  imageId: item.imageId,
  relativePath: item.relativePath,
  actualLabel: item.actualLabel,
  filename: item.relativePath.replace('images/', ''),
  groundTruth: item.actualLabel,
  predictedClass: item.predictedClass,
  confidence: item.confidence,
  defectProbability: item.defectProbability,
  outcome: item.outcome
}));
