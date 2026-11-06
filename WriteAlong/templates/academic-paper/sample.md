---
title: Low-Power Acoustic Monitoring of Urban Bird Populations with On-Device Classification
author:
  - Mei-Lin Okafor
  - Daniel R. Haverford
  - Sofia Lindqvist
date: Proceedings of the Workshop on Sensing for Ecology, 2026
abstract: >
  Long-term acoustic surveys are a cost-effective way to track bird populations,
  but continuous recording produces terabytes of audio that must be transferred
  and analysed off-site. We present a battery-powered sensor that classifies
  vocalisations on the device and transmits only species detections. A
  compact convolutional network, quantised to 8-bit integers, recognises 48
  common urban species with a macro-averaged F1 score of 0.87 while drawing
  under 40 mW. Over a six-month deployment of 32 nodes, the system reduced
  data volume by four orders of magnitude and matched expert annotations on
  94% of sampled detections.
---

# Introduction

Birds are sensitive indicators of environmental change, and their vocalisations make them unusually easy to survey by ear. Passive acoustic monitoring replaces the human observer with an unattended recorder, allowing surveys that run day and night for months at a time. The approach has transformed the study of remote habitats, yet it scales poorly: a single recorder sampling at 48 kHz produces roughly 8 GB of audio per day, and the analysis of that audio is usually the bottleneck of a study.

Cities present an additional difficulty. Urban soundscapes are dominated by traffic, construction and human voices, which both mask bird song and inflate the volume of irrelevant recordings. Researchers therefore face a choice between short, carefully scheduled recordings and long recordings that are expensive to store and process.

This paper argues that the classification step belongs on the sensor itself. Our contributions are:

1. an open hardware design for a low-cost acoustic node with a six-month battery life;
2. a quantised classifier for 48 urban species that runs in real time on a microcontroller;
3. a field evaluation comparing on-device detections with expert annotations.

# Related Work

## Acoustic indices

Early work summarised soundscapes with acoustic indices such as spectral entropy and the bioacoustic index. These measures are cheap to compute but correlate only loosely with species richness, particularly in noisy environments.

## Deep learning for bird sound

Convolutional networks applied to log-mel spectrograms now dominate bird sound recognition benchmarks. The strongest models, however, contain tens of millions of parameters and are run on servers or desktop GPUs. Recent studies on keyword spotting show that much smaller networks can achieve competitive accuracy on narrow vocabularies, which motivates our design.

# System Design

## Hardware

Each node combines a Cortex-M7 microcontroller, a MEMS microphone, a LoRa radio and three D-cell batteries in a weatherproof enclosure. The bill of materials costs under USD 60 at small volumes.

## Classifier

Audio is captured in 3-second windows with 50% overlap and converted to 64-band log-mel spectrograms. A depthwise-separable network with five convolutional blocks produces a probability for each species and a background class. The inference loop is deliberately simple:

```c
while (running) {
    capture_window(buf, WINDOW_MS);
    melspec(buf, spec);
    int k = classify(spec, &score);
    if (k != BACKGROUND && score > THRESH)
        enqueue_detection(k, score, now());
}
```

### Quantisation

Weights and activations are quantised to 8-bit integers after training. Quantisation-aware fine-tuning recovers most of the accuracy lost by naive post-training quantisation.

# Evaluation

We deployed 32 nodes across parks, rooftops and residential streets for six months. A random sample of 2,000 detections was reviewed by two expert annotators.

| Configuration       | F1    | Power (mW) | Data/day   |
|:--------------------|------:|-----------:|-----------:|
| Continuous recording |   —   |        210 |    8.1 GB  |
| Server-side CNN     | 0.91  |        210 |    8.1 GB  |
| On-device, float32  | 0.88  |         95 |    0.9 MB  |
| On-device, int8     | 0.87  |         38 |    0.9 MB  |

The quantised model loses only 0.04 F1 relative to the server-side baseline while reducing power by a factor of five. Most errors involved acoustically similar species pairs, such as the great tit and the coal tit.

> Annotators agreed with the node on 94% of sampled detections; disagreements were concentrated in the hour after dawn, when choruses overlap.

# Conclusion

On-device classification makes long, dense acoustic surveys practical in cities. Future work will extend the species list, add on-device calibration for local dialects of song, and investigate federated updates to the classifier across a deployment.
