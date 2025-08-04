import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type HazardLevel = 'low' | 'medium' | 'high';

interface Additive {
  id: string;
  name: string;
  hazard_level: HazardLevel;
  description_short: string;
  description_full: string;
  aliases: string[];
}

interface Recipe {
  id: string;
  title: string;
  youtube_url: string;
}

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<'additives' | 'recipes'>('additives');
  const [additives, setAdditives] = useState<Additive[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Additive | Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for additive
  const [formData, setFormData] = useState({
    name: '',
    hazard_level: 'medium' as HazardLevel,
    description_short: '',
    description_full: '',
    aliases: '',
    title: '',
    youtube_url: '',
  });

  const loadAdditives = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.130:5001/fudism-7fae8/us-central1/api/admin/additives');
      if (response.ok) {
        const data = await response.json();
        setAdditives(data.data || []);
      }
    } catch (error) {
      Alert.alert('오류', '첨가물 데이터를 불러올 수 없습니다.');
    }
    setLoading(false);
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.1.130:5001/fudism-7fae8/us-central1/api/admin/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.data || []);
      }
    } catch (error) {
      Alert.alert('오류', '레시피 데이터를 불러올 수 없습니다.');
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (activeTab === 'additives') {
      loadAdditives();
    } else {
      loadRecipes();
    }
  }, [activeTab]);

  const handleSave = async () => {
    const isAdditive = activeTab === 'additives';
    const endpoint = isAdditive ? 'additives' : 'recipes';
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem 
      ? `http://192.168.1.130:5001/fudism-7fae8/us-central1/api/admin/${endpoint}/${editingItem.id}`
      : `http://192.168.1.130:5001/fudism-7fae8/us-central1/api/admin/${endpoint}`;

    const payload = isAdditive 
      ? {
          name: formData.name,
          hazard_level: formData.hazard_level,
          description_short: formData.description_short,
          description_full: formData.description_full,
          aliases: formData.aliases.split(',').map(s => s.trim()).filter(s => s),
        }
      : {
          title: formData.title,
          youtube_url: formData.youtube_url,
        };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('성공', `${isAdditive ? '첨가물' : '레시피'}이 저장되었습니다.`);
        setShowAddModal(false);
        setEditingItem(null);
        resetForm();
        if (isAdditive) {
          loadAdditives();
        } else {
          loadRecipes();
        }
      } else {
        Alert.alert('오류', '저장에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      '삭제 확인',
      '정말 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const endpoint = activeTab === 'additives' ? 'additives' : 'recipes';
            try {
              const response = await fetch(
                `http://192.168.1.130:5001/fudism-7fae8/us-central1/api/admin/${endpoint}/${id}`,
                { method: 'DELETE' }
              );
              if (response.ok) {
                Alert.alert('성공', '삭제되었습니다.');
                if (activeTab === 'additives') {
                  loadAdditives();
                } else {
                  loadRecipes();
                }
              }
            } catch (error) {
              Alert.alert('오류', '삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      hazard_level: 'medium',
      description_short: '',
      description_full: '',
      aliases: '',
      title: '',
      youtube_url: '',
    });
  };

  const openEditModal = (item: Additive | Recipe) => {
    setEditingItem(item);
    if (activeTab === 'additives') {
      const additive = item as Additive;
      setFormData({
        name: additive.name,
        hazard_level: additive.hazard_level,
        description_short: additive.description_short,
        description_full: additive.description_full,
        aliases: additive.aliases.join(', '),
        title: '',
        youtube_url: '',
      });
    } else {
      const recipe = item as Recipe;
      setFormData({
        name: '',
        hazard_level: 'medium',
        description_short: '',
        description_full: '',
        aliases: '',
        title: recipe.title,
        youtube_url: recipe.youtube_url,
      });
    }
    setShowAddModal(true);
  };

  const getHazardColor = (level: HazardLevel) => {
    switch (level) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#757575';
    }
  };

  const getHazardText = (level: HazardLevel) => {
    switch (level) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      default: return level;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>관리자 패널</ThemedText>
      </ThemedView>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'additives' && styles.activeTab]}
          onPress={() => setActiveTab('additives')}
        >
          <Text style={[styles.tabText, activeTab === 'additives' && styles.activeTabText]}>
            첨가물 관리
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recipes' && styles.activeTab]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.tabText, activeTab === 'recipes' && styles.activeTabText]}>
            레시피 관리
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setEditingItem(null);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Text style={styles.addButtonText}>
          + {activeTab === 'additives' ? '첨가물' : '레시피'} 추가
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'additives' ? (
          // Additives List
          additives.map((additive) => (
            <View key={additive.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{additive.name}</Text>
                <View style={[styles.hazardBadge, { backgroundColor: getHazardColor(additive.hazard_level) }]}>
                  <Text style={styles.hazardText}>{getHazardText(additive.hazard_level)}</Text>
                </View>
              </View>
              <Text style={styles.itemDescription}>{additive.description_short}</Text>
              <Text style={styles.itemAliases}>별명: {additive.aliases.join(', ')}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(additive)}
                >
                  <Text style={styles.actionButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(additive.id)}
                >
                  <Text style={styles.actionButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          // Recipes List
          recipes.map((recipe) => (
            <View key={recipe.id} style={styles.card}>
              <Text style={styles.itemName}>{recipe.title}</Text>
              <Text style={styles.itemDescription}>{recipe.youtube_url}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(recipe)}
                >
                  <Text style={styles.actionButtonText}>수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(recipe.id)}
                >
                  <Text style={styles.actionButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancelButton}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingItem ? '수정' : '추가'} - {activeTab === 'additives' ? '첨가물' : '레시피'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSaveButton}>저장</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {activeTab === 'additives' ? (
              // Additive Form
              <>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="첨가물 이름을 입력하세요"
                />

                <Text style={styles.label}>위험도</Text>
                <View style={styles.hazardSelector}>
                  {(['low', 'medium', 'high'] as HazardLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.hazardOption,
                        formData.hazard_level === level && styles.selectedHazardOption,
                        { borderColor: getHazardColor(level) }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, hazard_level: level }))}
                    >
                      <Text style={[styles.hazardOptionText, { color: getHazardColor(level) }]}>
                        {getHazardText(level)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>간단한 설명</Text>
                <TextInput
                  style={styles.input}
                  value={formData.description_short}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description_short: text }))}
                  placeholder="한 줄 설명을 입력하세요"
                />

                <Text style={styles.label}>상세 설명</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description_full}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description_full: text }))}
                  placeholder="상세한 설명을 입력하세요"
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>별명 (쉼표로 구분)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.aliases}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, aliases: text }))}
                  placeholder="별명1, 별명2, 별명3"
                />
              </>
            ) : (
              // Recipe Form
              <>
                <Text style={styles.label}>제목</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="레시피 제목을 입력하세요"
                />

                <Text style={styles.label}>유튜브 URL</Text>
                <TextInput
                  style={styles.input}
                  value={formData.youtube_url}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, youtube_url: text }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#757575',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  addButton: {
    margin: 15,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  hazardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hazardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemAliases: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    color: '#F44336',
    fontSize: 16,
  },
  modalSaveButton: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hazardSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  hazardOption: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  selectedHazardOption: {
    backgroundColor: '#f0f0f0',
  },
  hazardOptionText: {
    fontWeight: 'bold',
  },
});